
import { NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { transactionDb } from "@/lib/db/transaction";
import { deliveries, orders } from "@/lib/db/schema";

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

    const rows = await transactionDb
    .select({
        id: deliveries.id,
        orderId: deliveries.orderId,
        date: deliveries.date,
        method: deliveries.method,
        recipient: deliveries.recipient,
        address: deliveries.address,
        transportCost: deliveries.transportCost,
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .where(eq(orders.businessId, businessId))
    .orderBy(desc(deliveries.date));

    return NextResponse.json(rows);
} catch (error) {
    console.error("Failed to fetch deliveries:", error);
    return NextResponse.json(
    { error: "Failed to fetch deliveries" },
    { status: 500 },
    );
}
}

export async function POST(request: Request) {
try {
    const body = await request.json();

    const {
    id,
    orderId,
    date,
    method,
    recipient,
    address,
    transportCost = 0,
    } = body;

    if (!id || !orderId || !date || !method) {
    return NextResponse.json(
        { error: "id, orderId, date, and method are required" },
        { status: 400 },
    );
    }

    if (!["own", "expedition", "pickup"].includes(method)) {
    return NextResponse.json(
        { error: "method must be own, expedition, or pickup" },
        { status: 400 },
    );
    }

    if (
    typeof transportCost !== "number" ||
    !Number.isFinite(transportCost) ||
    transportCost < 0
    ) {
    return NextResponse.json(
        { error: "transportCost must be a non-negative number" },
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

    const [order] = await transactionDb
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

    if (!order) {
    return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
    );
    }

    const [existing] = await transactionDb
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(eq(deliveries.id, id))
    .limit(1);

    if (existing) {
    return NextResponse.json(
        { error: "Delivery ID already exists" },
        { status: 409 },
    );
    }

    await transactionDb.insert(deliveries).values({
    id,
    orderId,
    date,
    method,
    recipient: recipient || null,
    address: address || null,
    transportCost: transportCost.toFixed(2),
    });

    return NextResponse.json(
    { message: "Delivery recorded successfully", id },
    { status: 201 },
    );
} catch (error) {
    console.error("Failed to record delivery:", error);
    return NextResponse.json(
    { error: "Failed to record delivery" },
    { status: 500 },
    );
}
}