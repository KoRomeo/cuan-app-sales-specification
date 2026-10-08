import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { suppliers } from "@/lib/db/schema"

export async function GET() {
  try {
    const suppliersList = await db.select().from(suppliers)

    return NextResponse.json(suppliersList)
  } catch (error) {
    console.error("Failed to fetch suppliers:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch suppliers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      id,
      businessId,
      name,
      contact,
    } = body

    if (!id || !businessId || !name) {
      return NextResponse.json(
        {
          error: "Supplier ID, business ID and name are required",
        },
        { status: 400 },
      )
    }

    const [supplier] = await db
      .insert(suppliers)
      .values({
        id,
        businessId,
        name,
        contact: contact || null,
      })
      .returning()

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Failed to create supplier:", error)

    return NextResponse.json(
      {
        error: "Failed to create supplier",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}