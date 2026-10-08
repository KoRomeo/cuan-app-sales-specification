import { NextResponse } from "next/server"
import { getCustomersWithStats } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { customers } from "@/lib/db/schema"

export async function GET() {
  try {
    const customersList = await getCustomersWithStats()

    return NextResponse.json(customersList)
  } catch (error) {
    console.error("Failed to fetch customers:", error)

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { id, businessId, name, phone, address, location } = body

    if (!id || !businessId || !name) {
      return NextResponse.json(
        { error: "Customer ID, business ID and name are required" },
        { status: 400 },
      )
    }

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
      .returning()

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Failed to create customer:", error)

    return NextResponse.json(
      {
        error: "Failed to create customer",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}