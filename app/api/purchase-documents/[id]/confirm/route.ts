import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"
import { requireBusinessAccess } from "@/lib/api-auth"
import { purchaseDocuments, purchases, purchaseItems, suppliers, products, stockMovements, journalEntries, journalEntryLines, payments, financialAccounts } from "@/lib/db/schema"

type Ctx = { params: Promise<{ id: string }> }
type InvoiceItem = { productName?: string; unit?: string | null; quantity?: number; unitCost?: number; lineTotal?: number; discount?: number; discountType?: 'amount' | 'percent' }
export async function POST(request: NextRequest, { params }: Ctx) {
 const { id } = await params
 let businessId = ""
 try {
  const body = await request.json() as { businessId?:string; supplierId?:string; createSupplier?:boolean; itemProductIds?:Record<string,string>; createProductIndexes?:number[]; date?:string; dueDate?:string|null; notes?:string|null; paidAmount?:number; paymentAccount?:string; paymentId?:string; paymentDate?:string }
  businessId=body.businessId??""
  const access=await requireBusinessAccess(businessId)
  if(!access.ok)return NextResponse.json({error:access.error},{status:access.status})
  const result=await db.transaction(async tx=>{
   const [doc]=await tx.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.id,id),eq(purchaseDocuments.businessId,businessId))).limit(1)
   if(!doc)throw new Error("DOCUMENT_NOT_FOUND")
   if(doc.status==="confirmed"&&doc.purchaseId)return {purchaseId:doc.purchaseId,alreadyConfirmed:true}
   if(doc.status!=="review"||!doc.extractedData)throw new Error("DOCUMENT_NOT_REVIEWABLE")
   const data=doc.extractedData as Record<string,unknown>
   const lines=Array.isArray(data.items)?data.items as InvoiceItem[]:[]
   if(!lines.length)throw new Error("NO_ITEMS")
   const date=body.date|| (typeof data.date==="string"?data.date:new Date().toISOString().slice(0,10))
   const dueDate=body.dueDate!==undefined?body.dueDate:(typeof data.dueDate==="string"?data.dueDate:null)
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z")))throw new Error("INVALID_DATE")
   if(dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||Number.isNaN(Date.parse(dueDate+"T00:00:00Z"))))throw new Error("INVALID_DUE_DATE")
   // Atomic claim prevents concurrent requests from posting stock/accounting twice.
   const [claimed]=await tx.update(purchaseDocuments).set({status:"confirming",updatedAt:new Date()}).where(and(eq(purchaseDocuments.id,id),eq(purchaseDocuments.businessId,businessId),eq(purchaseDocuments.status,"review"))).returning({id:purchaseDocuments.id})
   if(!claimed)throw new Error("DOCUMENT_ALREADY_BEING_CONFIRMED")
   let supplierId=body.supplierId
   if(body.createSupplier){
    if(typeof data.supplierName!=="string"||!data.supplierName.trim())throw new Error("SUPPLIER_NAME_REQUIRED")
    const [sameName]=await tx.select({id:suppliers.id}).from(suppliers).where(and(eq(suppliers.businessId,businessId),eq(suppliers.name,data.supplierName.trim()))).limit(1)
    if(sameName)throw new Error("SUPPLIER_DUPLICATE")
    const supplierID=await generateEntityId(tx,suppliers,businessId,"SUP",date)
    const [created]=await tx.insert(suppliers).values({id:supplierID,businessId,name:data.supplierName.trim(),contact:null}).returning({id:suppliers.id})
    supplierId=created.id
   }
   if(!supplierId)throw new Error("SUPPLIER_REQUIRED")
   const [supplier]=await tx.select({id:suppliers.id}).from(suppliers).where(and(eq(suppliers.id,supplierId),eq(suppliers.businessId,businessId))).limit(1)
   if(!supplier)throw new Error("SUPPLIER_NOT_FOUND")
   const createIndexes=new Set([...(body.createProductIndexes??[]), ...lines.flatMap((line,i)=>line.productMatch === 'new' ? [i] : [])])
   const chosen={...Object.fromEntries(lines.flatMap((line,i)=>line.productId ? [[String(i),line.productId]] : [])), ...(body.itemProductIds??{})}
   const resolved: Array<{id:string;qty:number;unitCost:number;discount:number;discountType:'amount'|'percent';netTotal:number}>=[]
   for(let i=0;i<lines.length;i++){
    const line=lines[i]
    const qty=Number(line.quantity), unitCost=Number(line.unitCost)
    const discount=Number(line.discount??0), discountType=line.discountType??"amount", gross=qty*unitCost
    if(!line.productName?.trim()||!Number.isSafeInteger(qty)||qty<=0||!Number.isFinite(unitCost)||unitCost<0||!Number.isFinite(discount)||discount<0||(discountType!=="amount"&&discountType!=="percent")||(discountType==="percent"?discount>100:discount>gross))throw new Error("INVALID_ITEM")
    let productId=chosen[String(i)]
    if(createIndexes.has(i)){
      const name=line.unit?.trim()?line.productName.trim()+"_(" + line.unit.trim()+")":line.productName.trim()
      const [existing]=await tx.select({id:products.id}).from(products).where(and(eq(products.businessId,businessId),eq(products.name,name))).limit(1)
      if(existing)throw new Error("DUPLICATE_PRODUCT_NAME")
      productId=await generateEntityId(tx,products,businessId,"PRD",date)
      await tx.insert(products).values({id:productId,businessId,name,sellingPrice:unitCost.toFixed(2),costReference:unitCost.toFixed(2),averageCost:unitCost.toFixed(2),minimumStock:0})
     }
     if(!productId)throw new Error("PRODUCT_MATCH_REQUIRED")
     const [product]=await tx.select({id:products.id}).from(products).where(and(eq(products.id,productId),eq(products.businessId,businessId))).limit(1)
     if(!product)throw new Error("PRODUCT_NOT_FOUND")
     const discountAmount=discountType==="percent"?gross*discount/100:discount
    resolved.push({id:productId,qty,unitCost,discount,discountType,netTotal:gross-discountAmount})
   }
   const purchaseId=await generateEntityId(tx,purchases,businessId,"PUR",date)
   const total=resolved.reduce((sum,line)=>sum+line.netTotal,0)
   const paidAmount=Number(body.paidAmount??0)
   if(!Number.isFinite(paidAmount)||paidAmount<0||paidAmount>total)throw new Error("INVALID_PAID_AMOUNT")
   const paymentDate=body.paymentDate||date
   if(paidAmount>0&&(!body.paymentId?.trim()||Number.isNaN(Date.parse(paymentDate+"T00:00:00Z"))||!body.paymentAccount?.trim()))throw new Error("INVALID_PAYMENT")
   let paymentAccount=""
   if(paidAmount>0){const [account]=await tx.select({name:financialAccounts.name}).from(financialAccounts).where(and(eq(financialAccounts.businessId,businessId),eq(financialAccounts.name,body.paymentAccount!.trim()),eq(financialAccounts.active,true))).limit(1);if(!account)throw new Error("PAYMENT_ACCOUNT_NOT_FOUND");paymentAccount=account.name}
   await tx.insert(purchases).values({id:purchaseId,businessId,date,supplierId,dueDate:paidAmount>=total?null:(dueDate||null),notes:body.notes||("Imported from invoice "+(typeof data.invoiceNumber==="string"?data.invoiceNumber:doc.fileName))})
   await tx.insert(purchaseItems).values(resolved.map((line,i)=>({id:"PI-"+purchaseId+"-"+(i+1),purchaseId,productId:line.id,qty:line.qty,unitCost:line.unitCost.toFixed(2),discount:line.discount.toFixed(2),discountType:line.discountType})))
   const productIds=[...new Set(resolved.map(x=>x.id))]
   const oldProducts=await tx.select({id:products.id,averageCost:products.averageCost}).from(products).where(and(eq(products.businessId,businessId),inArray(products.id,productIds)))
   const movements=await tx.select({productId:stockMovements.productId,qty:stockMovements.qty}).from(stockMovements).where(and(eq(stockMovements.businessId,businessId),inArray(stockMovements.productId,productIds)))
   const stock=new Map<string,number>();for(const m of movements)stock.set(m.productId,(stock.get(m.productId)||0)+m.qty)
   const totals=new Map<string,{qty:number;cost:number}>()
   resolved.forEach(x=>{const v=totals.get(x.id)||{qty:0,cost:0};v.qty+=x.qty;v.cost+=x.netTotal;totals.set(x.id,v)})
   await tx.insert(stockMovements).values(resolved.map((x,i)=>({id:"MOV-PUR-"+purchaseId+"-"+(i+1),businessId,date,productId:x.id,type:"purchase" as const,qty:x.qty,reference:"purchase:"+purchaseId+":receive"})))
   for(const [pid,received] of totals){const p=oldProducts.find(x=>x.id===pid)!;const before=stock.get(pid)||0;const avg=before>0?((before*Number(p.averageCost)+received.cost)/(before+received.qty)):(received.cost/received.qty);await tx.update(products).set({averageCost:avg.toFixed(2)}).where(and(eq(products.id,pid),eq(products.businessId,businessId)))}
   const je="JE-PUR-"+purchaseId
   await tx.insert(journalEntries).values({id:je,businessId,entryDate:date,kind:"purchase",reference:purchaseId,description:"Invoice purchase from "+supplierId})
   await tx.insert(journalEntryLines).values([{id:je+"-inventory",journalEntryId:je,account:"Inventory",debit:total.toFixed(2),credit:"0"},{id:je+"-payable",journalEntryId:je,account:"Accounts Payable",debit:"0",credit:total.toFixed(2)}])
   if(paidAmount>0){
    await tx.insert(payments).values({id:body.paymentId!,businessId,orderId:null,purchaseId,date:paymentDate,amount:paidAmount.toFixed(2),account:paymentAccount})
    const paymentJournalId="JE-AI-PAY-"+purchaseId
    await tx.insert(journalEntries).values({id:paymentJournalId,businessId,entryDate:paymentDate,kind:"supplier-payment",reference:purchaseId,description:"Payment for AI invoice purchase"})
    await tx.insert(journalEntryLines).values([{id:paymentJournalId+"-payable",journalEntryId:paymentJournalId,account:"Accounts Payable",debit:paidAmount.toFixed(2),credit:"0"},{id:paymentJournalId+"-cash",journalEntryId:paymentJournalId,account:paymentAccount,debit:"0",credit:paidAmount.toFixed(2)}])
   }
   await tx.update(purchaseDocuments).set({status:"confirmed",purchaseId,confirmedAt:new Date(),updatedAt:new Date(),errorMessage:null}).where(and(eq(purchaseDocuments.id,id),eq(purchaseDocuments.businessId,businessId)))
   return {purchaseId,alreadyConfirmed:false}
  })
  if(!result.alreadyConfirmed)await writeAudit({businessId,page:"Purchases",action:"Confirmed AI invoice purchase",reference:result.purchaseId})
  return NextResponse.json({message:result.alreadyConfirmed?"Invoice was already confirmed":"Invoice confirmed as purchase",...result},{status:result.alreadyConfirmed?200:201})
 }catch(error){
  const message=error instanceof Error?error.message:""
  const status:Record<string,[string,number]>={DOCUMENT_NOT_FOUND:["Document not found",404],DOCUMENT_NOT_REVIEWABLE:["Document must be reviewed before confirmation",409],DOCUMENT_ALREADY_BEING_CONFIRMED:["Document is already being confirmed",409],INVALID_DATE:["Invoice date is invalid",400],INVALID_DUE_DATE:["Due date is invalid",400],NO_ITEMS:["Invoice contains no items",400],SUPPLIER_REQUIRED:["Select or create a supplier",400],SUPPLIER_NAME_REQUIRED:["Supplier name is required",400],SUPPLIER_DUPLICATE:["A supplier with this name already exists. Select the existing supplier instead.",409],SUPPLIER_NOT_FOUND:["Supplier not found in this business",404],INVALID_ITEM:["One or more invoice items have invalid quantity/cost",400],INVALID_PAID_AMOUNT:["Paid amount must be between zero and the invoice total",400],INVALID_PAYMENT:["A payment ID, date, and account are required when an amount is paid",400],PAYMENT_ACCOUNT_NOT_FOUND:["Select an active cash or bank account for this business",400],PRODUCT_MATCH_REQUIRED:["Match each item to a product or choose add new product",400],PRODUCT_NOT_FOUND:["Selected product not found in this business",404],DUPLICATE_PRODUCT_NAME:["That product name already exists. Select the existing product instead.",409]}
  if(status[message])return NextResponse.json({error:status[message][0]},{status:status[message][1]})
  console.error("Invoice confirmation failed",error)
  // Restore the review state on failure so the user can correct mappings and retry.
  await db.update(purchaseDocuments).set({status:"review",updatedAt:new Date(),errorMessage:"Confirmation failed; review mappings and retry."}).where(and(eq(purchaseDocuments.id,id),eq(purchaseDocuments.businessId,businessId),eq(purchaseDocuments.status,"confirming"))).catch(()=>undefined)
  return NextResponse.json({error:"Invoice confirmation failed",detail:message||String(error)},{status:500})
 }
}
