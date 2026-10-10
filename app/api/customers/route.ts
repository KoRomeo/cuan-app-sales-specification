import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businessMembers, customers } from "@/lib/db/schema";

async function getBusinessAccess(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" };
  const [member] = await db.select({ userId: businessMembers.userId }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1);
  return member ? { ok: true as const } : { ok: false as const, status: 403, error: "You do not have access to this business" };
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await getBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const customersList = await db.select().from(customers).where(eq(customers.businessId, businessId));

    return NextResponse.json(customersList);
  } catch (error) {
    console.error("Failed to fetch customers:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { id, businessId, name, phone, address, location } = body;

    if (!id || !businessId || !name) {
      return NextResponse.json(
        { error: "Customer ID, business ID and name are required" },
        { status: 400 },
      );
    }
    const access = await getBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [customer] = await db
      .insert(customers)
      .values({
        id,
        businessId,
        name,
        phone: phone || null,
        address: address || null,
        location: location || null,
      })
      .returning();

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);

    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
