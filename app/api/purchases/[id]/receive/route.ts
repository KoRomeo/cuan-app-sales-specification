import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, purchaseItems, purchases, stockMovements } from "@/lib/db/schema"
import { headers } from "next/headers"

type Context = { params: Promise<{ id: string }> }
export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params; const body = await request.json().catch(() => ({})); const businessId = body.businessId
    if (typeof businessId !== "string" || !businessId.trim()) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1); if (!member) return NextResponse.json({ error: "You do not have access to this business" }, { status: 403 })
    const result = await db.transaction(async (tx) => {
      const [purchase] = await tx.select({ id: purchases.id, businessId: purchases.businessId }).from(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId))).for("update").limit(1); if (!purchase) throw new Error("NOT_FOUND")
      const lines = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)); const reference = `purchase:${id}:receive`
      const existing = await tx.select({ id: stockMovements.id }).from(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, reference))).limit(1); if (existing[0]) throw new Error("ALREADY_RECEIVED")
      await tx.insert(stockMovements).values(lines.map((line) => ({ id: `SM-RECEIVE-${line.id}`, businessId, date: new Date().toISOString().slice(0, 10), productId: line.productId, type: "purchase" as const, qty: line.qty, reference })))
      return { id }
    })
    return NextResponse.json({ message: "Purchase received successfully", ...result })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    if (error instanceof Error && error.message === "ALREADY_RECEIVED") return NextResponse.json({ error: "Purchase was already received" }, { status: 409 })
    console.error("POST /api/purchases/[id]/receive", error); return NextResponse.json({ error: "Failed to receive purchase" }, { status: 500 })
  }
}
