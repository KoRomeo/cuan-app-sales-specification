import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { customers } from "@/lib/db/schema"

export async function GET(
_request: Request,
{ params }: { params: Promise<{ id: string }> },
) {
try {
    const { id } = await params

    const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

    if (!customer) {
    return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(customer)
} catch (error) {
    console.error("Failed to fetch customer:", error)

    return NextResponse.json(
    {
        error: "Failed to fetch customer",
        details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
    )
}
}

export async function PATCH(
request: Request,
{ params }: { params: Promise<{ id: string }> },
) {
try {
    const { id } = await params
    const body = await request.json()

    const { name, phone, address, location } = body

    const [customer] = await db
    .update(customers)
    .set({
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(location !== undefined && { location }),
    })
    .where(eq(customers.id, id))
    .returning()

    if (!customer) {
    return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(customer)
} catch (error) {
    console.error("Failed to update customer:", error)

    return NextResponse.json(
    {
        error: "Failed to update customer",
        details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
    )
}
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const [customer] = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning()

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      message: "Customer deleted successfully",
      customer,
    })
  } catch (error) {
    console.error("Failed to delete customer:", error)

    return NextResponse.json(
      {
        error: "Failed to delete customer",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}