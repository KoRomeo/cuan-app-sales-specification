
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"

export async function GET(
_request: Request,
{ params }: { params: Promise<{ id: string }> },
) {
try {
    const { id } = await params

    const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

    if (!product) {
    return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(product)
} catch (error) {
    console.error("Failed to fetch product:", error)

    return NextResponse.json(
    {
        error: "Failed to fetch product",
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

    const {
    name,
    sellingPrice,
    costReference,
    averageCost,
    minimumStock,
    } = body

    const [product] = await db
    .update(products)
    .set({
        ...(name !== undefined && { name }),
        ...(sellingPrice !== undefined && {
        sellingPrice: String(sellingPrice),
        }),
        ...(costReference !== undefined && {
        costReference: String(costReference),
        }),
        ...(averageCost !== undefined && {
        averageCost: String(averageCost),
        }),
        ...(minimumStock !== undefined && { minimumStock }),
    })
    .where(eq(products.id, id))
    .returning()

    if (!product) {
    return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(product)
} catch (error) {
    console.error("Failed to update product:", error)

    return NextResponse.json(
    {
        error: "Failed to update product",
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

    const [product] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning()

    if (!product) {
    return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
    )
    }

    return NextResponse.json({
    message: "Product deleted successfully",
    product,
    })
} catch (error) {
    console.error("Failed to delete product:", error)

    return NextResponse.json(
    {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
    )
}
}