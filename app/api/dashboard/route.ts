import { NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { requireBusinessAccess } from "@/lib/api-auth"
import {
  customers,
  deliveries,
  expenses,
  orderItems,
  orders,
  payments,
  products,
  purchaseItems,
  purchases,
  stockMovements,
  suppliers,
} from "@/lib/db/schema"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    }

    const access = await requireBusinessAccess(businessId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const [
      customerRows,
      productRows,
      orderRows,
      purchaseRows,
      supplierRows,
      paymentRows,
      expenseRows,
      movementRows,
    ] = await Promise.all([
      db.select().from(customers).where(eq(customers.businessId, businessId)),
      db.select().from(products).where(eq(products.businessId, businessId)),
      db.select().from(orders).where(eq(orders.businessId, businessId)),
      db.select().from(purchases).where(eq(purchases.businessId, businessId)),
      db.select().from(suppliers).where(eq(suppliers.businessId, businessId)),
      db.select().from(payments).where(eq(payments.businessId, businessId)),
      db.select().from(expenses).where(eq(expenses.businessId, businessId)),
      db.select({
        productId: stockMovements.productId,
        stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)`,
      })
        .from(stockMovements)
        .where(eq(stockMovements.businessId, businessId))
        .groupBy(stockMovements.productId),
    ])

    const orderIds = orderRows.map((row) => row.id)
    const purchaseIds = purchaseRows.map((row) => row.id)

    const [orderItemRows, purchaseItemRows, deliveryRows] = await Promise.all([
      orderIds.length
        ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : Promise.resolve([]),
      purchaseIds.length
        ? db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds))
        : Promise.resolve([]),
      orderIds.length
        ? db.select().from(deliveries).where(inArray(deliveries.orderId, orderIds))
        : Promise.resolve([]),
    ])

    const ordersWithDetails = orderRows.map((order) => ({
      ...order,
      items: orderItemRows
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          ...item,
          price: Number(item.price),
          discount: Number(item.discount),
          unitCost: Number(item.unitCost),
        })),
      payments: paymentRows
        .filter((payment) => payment.orderId === order.id)
        .map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      delivery: deliveryRows.find((delivery) => delivery.orderId === order.id) ?? null,
    }))

    const purchasesWithDetails = purchaseRows.map((purchase) => ({
      ...purchase,
      items: purchaseItemRows
        .filter((item) => item.purchaseId === purchase.id)
        .map((item) => ({ ...item, unitCost: Number(item.unitCost) })),
      payments: paymentRows
        .filter((payment) => payment.purchaseId === purchase.id)
        .map((payment) => ({ ...payment, amount: Number(payment.amount) })),
    }))

    const stockByProduct = new Map(
      movementRows.map((row) => [row.productId, Number(row.stock)]),
    )

    return NextResponse.json({
      customers: customerRows,
      products: productRows.map((product) => ({
        ...product,
        sellingPrice: Number(product.sellingPrice),
        costReference: Number(product.costReference),
        averageCost: Number(product.averageCost),
        stock: stockByProduct.get(product.id) ?? 0,
      })),
      orders: ordersWithDetails,
      purchases: purchasesWithDetails,
      suppliers: supplierRows,
      expenses: expenseRows.map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
      })),
    })
  } catch (error) {
    console.error("Failed to load dashboard data", error)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}
