
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businessMembers, customers } from "@/lib/db/schema";
import { generateEntityId } from "@/lib/db/ids";
import { writeAudit } from "@/lib/audit";

async function getBusinessAccess(businessId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      ok: false as const,
      status: 401,
      error: "Authentication required",
    };
  }

  const [member] = await db
    .select({ userId: businessMembers.userId })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  return member
    ? { ok: true as const }
    : {
        ok: false as const,
        status: 403,
        error: "You do not have access to this business",
      };
}

function isValidText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function errorResponse(error: unknown, action: string) {
  console.error(`Failed to ${action} customer:`, error);

  // PostgreSQL unique_violation: duplicate customer name in a business.
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return NextResponse.json(
      { error: "A customer with this name already exists in this business" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { error: `Failed to ${action} customer` },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    const access = await getBusinessAccess(businessId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.businessId, businessId));

    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error, "fetch");
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { businessId, name, phone, address, location } = body as Record<
      string,
      unknown
    >;

    if (!isValidText(businessId) || !isValidText(name)) {
      return NextResponse.json(
        { error: "Business ID and customer name are required" },
        { status: 400 },
      );
    }

    const access = await getBusinessAccess(businessId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const customer = await db.transaction(async (tx) => {
      const id = await generateEntityId(tx, customers, businessId, "CUS", new Date().toISOString().slice(0, 10), "year");
      const [created] = await tx
        .insert(customers)
        .values({
          id,
          businessId,
          name: name.trim(),
          phone: optionalText(phone),
          address: optionalText(address),
          location: optionalText(location),
        })
        .returning();
      return created;
    });

    await writeAudit({ businessId, page: "Customers", action: "Created customer", reference: customer.id });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return errorResponse(error, "create");
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { id, businessId, name, phone, address, location } = body as Record<
      string,
      unknown
    >;

    if (
      !isValidText(id) ||
      !isValidText(businessId) ||
      !isValidText(name)
    ) {
      return NextResponse.json(
        { error: "Customer ID, business ID and name are required" },
        { status: 400 },
      );
    }

    const access = await getBusinessAccess(businessId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const [updated] = await db
      .update(customers)
      .set({
        name: name.trim(),
        phone: optionalText(phone),
        address: optionalText(address),
        location: optionalText(location),
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.businessId, businessId),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await writeAudit({ businessId, page: "Customers", action: "Updated customer", reference: String(id) });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "update");
  }
}

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { id, businessId } = body as Record<string, unknown>;

    if (!isValidText(id) || !isValidText(businessId)) {
      return NextResponse.json(
        { error: "Customer ID and business ID are required" },
        { status: 400 },
      );
    }

    const access = await getBusinessAccess(businessId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const [deleted] = await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.businessId, businessId),
        ),
      )
      .returning({ id: customers.id });

    if (!deleted) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await writeAudit({ businessId, page: "Customers", action: "Deleted customer", reference: deleted.id });
    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    return errorResponse(error, "delete");
  }
}
