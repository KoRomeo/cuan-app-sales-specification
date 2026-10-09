
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import {
purchases,
purchaseItems,
stockMovements,
suppliers,
products,
} from "@/lib/db/schema";

export async function GET() {
try {
    const purchaseRows = await transactionDb
    .select()
    .from(purchases);

    const itemRows = await transactionDb
    .select()
    .from(purchaseItems);

    const result = purchaseRows.map((purchase) => ({
    ...purchase,
    items: itemRows.filter(
        (item) => item.purchaseId === purchase.id,
    ),
    }));

    return NextResponse.json(result);
} catch (error) {
    console.error("GET /api/purchases:", error);
    return NextResponse.json(
    { error: "Failed to fetch purchases" },
    { status: 500 },
    );
}
}

export async function POST(request: NextRequest) {
try {

    const body = await request.json();

    const {
    id,
    businessId,
    date,
    supplierId,
    dueDate,
    notes,
    items,
    } = body as {
    id: string;
    businessId: string;
    date: string;
    supplierId: string;
    dueDate?: string | null;
    notes?: string | null;
    items: {
        id: string;
        productId: string;
        qty: number;
        unitCost: number | string;
    }[];
    };

    if (
    !id ||
    !businessId ||
    !date ||
    !supplierId ||
    !Array.isArray(items) ||
    items.length === 0
    ) {
    return NextResponse.json(
        { error: "Required purchase fields or items are missing" },
        { status: 400 },
    );
    }



const invalidItem = items.find(
  (item: {
    id?: string;
    productId?: string;
    qty?: number;
    unitCost?: number | string;
  }) => {
    const qty = Number(item.qty);
    const unitCost = Number(item.unitCost);

        return (
        !item.id ||
        !item.productId ||
        item.qty === undefined ||
        item.qty === null ||
        item.qty === undefined ||
        item.qty === null ||
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) <= 0 ||
        !Number.isInteger(qty) ||
        qty <= 0 ||
        item.unitCost === undefined ||
        item.unitCost === null ||
        item.unitCost === "" ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
        );
    },
    );

    if (invalidItem) {
    console.log("Invalid purchase item:", invalidItem);

    return NextResponse.json(
        {
        error:
            "Each item needs an ID, product ID, positive integer quantity, and valid unit cost",
        invalidItem,
        },
        { status: 400 },
    );
    }

    const productIds: string[] = [
    ...new Set(items.map((item) => item.productId)),
    ];

    await transactionDb.transaction(async (tx) => {
    const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(
        and(
            eq(suppliers.id, supplierId),
            eq(suppliers.businessId, businessId),
        ),
        );

    if (!supplier) {
        throw new Error("SUPPLIER_NOT_FOUND");
    }

    const matchingProducts = await tx
    .select()
    .from(products)
    .where(
        and(
        eq(products.businessId, businessId),
        inArray(products.id, productIds),
        ),
    );

    if (matchingProducts.length !== productIds.length) {
        throw new Error("PRODUCT_NOT_FOUND");
    }

    await tx.insert(purchases).values({
        id,
        businessId,
        date,
        supplierId,
        dueDate: dueDate || null,
        notes: notes || null,
    });

    await tx.insert(purchaseItems).values(
        items.map(
        (item: {
            id: string;
            productId: string;
            qty: number;
            unitCost: number | string;
        }) => ({
            id: item.id,
            purchaseId: id,
            productId: item.productId,
            qty: item.qty,
            unitCost: String(item.unitCost),
        }),
        ),
    );

    await tx.insert(stockMovements).values(
        items.map(
        (item: {
            id: string;
            productId: string;
            qty: number;
        }) => ({
            id: `SM-${item.id}`,
            businessId,
            date,
            productId: item.productId,
            type: "purchase" as const,
            qty: item.qty,
            reference: id,
        }),
        ),
    );
    });

    return NextResponse.json(
    { message: "Purchase created successfully", id },
    { status: 201 },
    );
} catch (error) {
    if (error instanceof Error) {
    if (error.message === "SUPPLIER_NOT_FOUND") {
        return NextResponse.json(
        { error: "Supplier not found for this business" },
        { status: 404 },
        );
    }

    if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
        { error: "One or more products were not found for this business" },
        { status: 404 },
        );
    }
    }

    console.error("POST /api/purchases:", error);

    return NextResponse.json(
    { error: "Failed to create purchase" },
    { status: 500 },
    );
}
}