import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, purchaseItems, purchases, stockMovements } from "@/lib/db/schema"
import { headers } from "next/headers"

type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params; const businessId = new URL(request.url).searchParams.get("businessId"); if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1); if (!member) return NextResponse.json({ error: "You do not have access to this business" }, { status: 403 })
    const [purchase] = await db.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId))).limit(1); if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)); const movements = await db.select().from(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `purchase:${id}:receive`)))
    return NextResponse.json({ ...purchase, items, stockMovements: movements })
  } catch (error) { console.error("GET /api/purchases/[id]", error); return NextResponse.json({ error: "Failed to fetch purchase details" }, { status: 500 })
  }
}
