
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"

export async function GET() {
try {
    const productsList = await db.select().from(products)

    return NextResponse.json(productsList)
} catch (error) {
    console.error("Failed to fetch products:", error)

    return NextResponse.json(
    {
        error: "Failed to fetch products",
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
    sellingPrice,
    costReference,
    averageCost,
    minimumStock,
    } = body

    if (
    !id ||
    !businessId ||
    !name ||
    sellingPrice === undefined ||
    costReference === undefined ||
    averageCost === undefined
    ) {
    return NextResponse.json(
        {
        error:
            "Product ID, business ID, name, selling price, cost reference, and average cost are required",
        },
        { status: 400 },
    )
    }

    const [product] = await db
    .insert(products)
    .values({
        id,
        businessId,
        name,
        sellingPrice: String(sellingPrice),
        costReference: String(costReference),
        averageCost: String(averageCost),
        minimumStock: minimumStock ?? 0,
    })
    .returning()

    return NextResponse.json(product, { status: 201 })
} catch (error) {
    console.error("Failed to create product:", error)

    return NextResponse.json(
    {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
    )
}
}