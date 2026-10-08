import { NextResponse } from "next/server"
import { getCustomersWithStats } from "@/lib/db/queries"

export async function GET() {
try {
    const customers = await getCustomersWithStats()

    return NextResponse.json(customers)
} catch (error) {
    console.error("Failed to fetch customers:", error)

    return NextResponse.json(
    { error: "Failed to fetch customers" },
    { status: 500 },
    )
}
}