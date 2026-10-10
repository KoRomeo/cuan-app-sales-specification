
import { NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import { payments, orders, purchases, journalEntries, journalEntryLines } from "@/lib/db/schema";
import { requireBusinessAccess } from "@/lib/api-auth";

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
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rows = await transactionDb
    .select()
    .from(payments)
    .where(eq(payments.businessId, businessId))
    .orderBy(desc(payments.date));

    return NextResponse.json(rows);
} catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
    { error: "Failed to fetch payments" },
    { status: 500 },
    );
}
}

export async function POST(request: Request) {
try {
    const body = await request.json();

    const {
    id,
    businessId,
    orderId,
    purchaseId,
    date,
    amount,
    account,
    } = body;

    if (
    !id ||
    !businessId ||
    !date ||
    amount === undefined ||
    amount === null ||
    !account
    ) {
    return NextResponse.json(
        { error: "id, businessId, date, amount, and account are required" },
        { status: 400 },
    );
    }

    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (
    (!orderId && !purchaseId) ||
    (orderId && purchaseId)
    ) {
    return NextResponse.json(
        { error: "Provide exactly one of orderId or purchaseId" },
        { status: 400 },
    );
    }

    if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
    ) {
    return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 },
    );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json(
        { error: "date must use YYYY-MM-DD format" },
        { status: 400 },
    );
    }

    if (typeof account !== "string" || !account.trim()) {
    return NextResponse.json(
        { error: "account must be a non-empty string" },
        { status: 400 },
    );
    }

    const existing = await transactionDb
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

    if (existing.length > 0) {
    return NextResponse.json(
        { error: "Payment ID already exists" },
        { status: 409 },
    );
    }

    if (orderId) {
    const [order] = await transactionDb
        .select({ id: orders.id })
        .from(orders)
        .where(
        and(
            eq(orders.id, orderId),
            eq(orders.businessId, businessId),
        ),
        )
        .limit(1);

    if (!order) {
        return NextResponse.json(
        { error: "Order not found for this business" },
        { status: 404 },
        );
    }
    }

    if (purchaseId) {
    const [purchase] = await transactionDb
        .select({ id: purchases.id })
        .from(purchases)
        .where(
        and(
            eq(purchases.id, purchaseId),
            eq(purchases.businessId, businessId),
        ),
        )
        .limit(1);

    if (!purchase) {
        return NextResponse.json(
        { error: "Purchase not found for this business" },
        { status: 404 },
        );
    }
    }

    await transactionDb.transaction(async (tx) => {
      await tx.insert(payments).values({
        id,
        businessId,
        orderId: orderId || null,
        purchaseId: purchaseId || null,
        date,
        amount: amount.toFixed(2),
        account: account.trim(),
      })
      const entryId = `JE-PAY-${id}`
      await tx.insert(journalEntries).values({
        id: entryId,
        businessId,
        entryDate: date,
        kind: "payment",
        reference: id,
        description: orderId ? `Customer payment for ${orderId}` : `Supplier payment for ${purchaseId}`,
      })
      await tx.insert(journalEntryLines).values(orderId ? [
        { id: `${entryId}-debit`, journalEntryId: entryId, account: account.trim(), debit: amount.toFixed(2), credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: "Accounts Receivable", debit: "0", credit: amount.toFixed(2) },
      ] : [
        { id: `${entryId}-debit`, journalEntryId: entryId, account: "Accounts Payable", debit: amount.toFixed(2), credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: account.trim(), debit: "0", credit: amount.toFixed(2) },
      ])
    })

    return NextResponse.json(
    { message: "Payment recorded successfully", id },
    { status: 201 },
    );
} catch (error) {
    console.error("Failed to record payment:", error);
    return NextResponse.json(
    { error: "Failed to record payment" },
    { status: 500 },
    );
}
}
