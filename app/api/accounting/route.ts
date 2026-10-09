
import { NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import {
orders,
orderItems,
payments,
purchases,
purchaseItems,
expenses,
} from "@/lib/db/schema";

export async function GET(request: Request) {
try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!businessId) {
    return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 },
    );
    }

    if (
    (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
    (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    ) {
    return NextResponse.json(
        { error: "Dates must use YYYY-MM-DD format" },
        { status: 400 },
    );
    }

    if (startDate && endDate && startDate > endDate) {
    return NextResponse.json(
        { error: "startDate cannot be after endDate" },
        { status: 400 },
    );
    }

    const dateConditions = [];
    if (startDate) dateConditions.push(gte(orders.date, startDate));
    if (endDate) dateConditions.push(lte(orders.date, endDate));

    const orderConditions = [eq(orders.businessId, businessId), ...dateConditions];

    const orderRows = await transactionDb
    .select({
        id: orders.id,
        date: orders.date,
        status: orders.status,
    })
    .from(orders)
    .where(and(...orderConditions));

    const orderIds = orderRows.map((order) => order.id);

    let salesRevenue = 0;
    let costOfGoodsSold = 0;

    if (orderIds.length > 0) {
    const itemRows = await transactionDb
        .select({
        qty: orderItems.qty,
        price: orderItems.price,
        discount: orderItems.discount,
        unitCost: orderItems.unitCost,
        orderId: orderItems.orderId,
        })
        .from(orderItems);

    const validItems = itemRows.filter((item) =>
        orderIds.includes(item.orderId),
    );

    for (const item of validItems) {
        const qty = Number(item.qty);
        const price = Number(item.price);
        const discount = Number(item.discount);
        const unitCost = Number(item.unitCost);

        salesRevenue += qty * Math.max(0, price - discount);
        costOfGoodsSold += qty * unitCost;
    }
    }

    const paymentConditions = [eq(payments.businessId, businessId)];
    if (startDate) paymentConditions.push(gte(payments.date, startDate));
    if (endDate) paymentConditions.push(lte(payments.date, endDate));

    const paymentRows = await transactionDb
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(...paymentConditions));

    const totalPaymentsReceived = paymentRows.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
    );

    const purchaseConditions = [eq(purchases.businessId, businessId)];
    if (startDate) purchaseConditions.push(gte(purchases.date, startDate));
    if (endDate) purchaseConditions.push(lte(purchases.date, endDate));

    const purchaseRows = await transactionDb
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(...purchaseConditions));

    const purchaseIds = purchaseRows.map((purchase) => purchase.id);
    let totalPurchases = 0;

    if (purchaseIds.length > 0) {
    const purchaseItemRows = await transactionDb
        .select({
        purchaseId: purchaseItems.purchaseId,
        qty: purchaseItems.qty,
        unitCost: purchaseItems.unitCost,
        })
        .from(purchaseItems);

    for (const item of purchaseItemRows) {
        if (purchaseIds.includes(item.purchaseId)) {
        totalPurchases += Number(item.qty) * Number(item.unitCost);
        }
    }
    }

    const expenseConditions = [eq(expenses.businessId, businessId)];
    if (startDate) expenseConditions.push(gte(expenses.date, startDate));
    if (endDate) expenseConditions.push(lte(expenses.date, endDate));

    const expenseRows = await transactionDb
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(and(...expenseConditions));

    const totalExpenses = expenseRows.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
    );

    return NextResponse.json({
    businessId,
    period: {
        startDate: startDate || null,
        endDate: endDate || null,
    },
    orderCount: orderRows.length,
    salesRevenue: Number(salesRevenue.toFixed(2)),
    costOfGoodsSold: Number(costOfGoodsSold.toFixed(2)),
    grossProfit: Number((salesRevenue - costOfGoodsSold).toFixed(2)),
    totalPaymentsReceived: Number(totalPaymentsReceived.toFixed(2)),
    totalPurchases: Number(totalPurchases.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    note: "Preliminary summary only; not a complete accounting statement.",
    });
} catch (error) {
    console.error("Failed to generate accounting summary:", error);
    return NextResponse.json(
    { error: "Failed to generate accounting summary" },
    { status: 500 },
    );
}
}