
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import { products, stockMovements } from "@/lib/db/schema";

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

    const productList = await transactionDb
    .select()
    .from(products)
    .where(eq(products.businessId, businessId));

    const movements = await transactionDb
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.businessId, businessId));

    const stockByProduct = new Map<string, number>();

    for (const movement of movements) {
    stockByProduct.set(
        movement.productId,
        (stockByProduct.get(movement.productId) ?? 0) + movement.qty,
    );
    }

    const result = productList.map((product) => ({
    productId: product.id,
    name: product.name,
    stock: stockByProduct.get(product.id) ?? 0,
    minimumStock: product.minimumStock,
    isLowStock:
        (stockByProduct.get(product.id) ?? 0) < product.minimumStock,
    }));

    return NextResponse.json(result);
} catch (error) {
    console.error("Failed to fetch stock:", error);

    return NextResponse.json(
    { error: "Failed to fetch stock" },
    { status: 500 },
    );
}
}