import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { suppliers } from "@/lib/db/schema"

export async function GET(
_request: Request,
{ params }: { params: Promise<{ id: string }> },
) {
try {
    const { id } = await params

    const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1)

    if (!supplier) {
    return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(supplier)
} catch (error) {
    console.error("Failed to fetch supplier:", error)

    return NextResponse.json(
    {
        error: "Failed to fetch supplier",
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

    const { name, contact } = body

    const [supplier] = await db
    .update(suppliers)
    .set({
        ...(name !== undefined && { name }),
        ...(contact !== undefined && { contact }),
    })
    .where(eq(suppliers.id, id))
    .returning()

    if (!supplier) {
    return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
    )
    }

    return NextResponse.json(supplier)
} catch (error) {
    console.error("Failed to update supplier:", error)

    return NextResponse.json(
    {
        error: "Failed to update supplier",
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

    const [supplier] = await db
    .delete(suppliers)
    .where(eq(suppliers.id, id))
    .returning()

    if (!supplier) {
    return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
    )
    }

    return NextResponse.json({
    message: "Supplier deleted successfully",
    supplier,
    })
} catch (error) {
    console.error("Failed to delete supplier:", error)

    return NextResponse.json(
    {
        error: "Failed to delete supplier",
        details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
    )
}
}