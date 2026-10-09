
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import {
purchases,
purchaseItems,
stockMovements,
} from "@/lib/db/schema";

type RouteContext = {
params: Promise<{ id: string }>;
};

export async function GET(
_request: Request,
{ params }: RouteContext,
) {
try {
    const { id } = await params;

    const [purchase] = await transactionDb
    .select()
    .from(purchases)
    .where(eq(purchases.id, id));

    if (!purchase) {
    return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 },
    );
    }

    const items = await transactionDb
    .select()
    .from(purchaseItems)
    .where(eq(purchaseItems.purchaseId, id));

    const movements = await transactionDb
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.reference, id));

    return NextResponse.json({
    ...purchase,
    items,
    stockMovements: movements,
    });
} catch (error) {
    console.error("GET /api/purchases/[id]:", error);

    return NextResponse.json(
    { error: "Failed to fetch purchase details" },
    { status: 500 },
    );
}
}