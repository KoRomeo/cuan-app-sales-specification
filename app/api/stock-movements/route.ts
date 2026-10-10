
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import { stockMovements } from "@/lib/db/schema";

export async function GET(request: Request) {
try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
    return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 },
    );
    }

    const movements = await transactionDb
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.businessId, businessId))
    .orderBy(desc(stockMovements.date));

    return NextResponse.json(movements);
} catch (error) {
    console.error("Failed to fetch stock movements:", error);

    return NextResponse.json(
    { error: "Failed to fetch stock movements" },
    { status: 500 },
    );
}
}