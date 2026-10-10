
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { transactionDb } from "@/lib/db/transaction";
import {
orders,
orderItems,
customers,
products,
stockMovements,
} from "@/lib/db/schema";

const VALID_STATUSES = [
"requested",
"ready",
"delivered",
"cancelled",
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

type OrderItemInput = {
id: string;
productId: string;
qty: number;
price: number | string;
discount?: number | string;
unitCost: number | string;
};

type DbTransaction = Parameters<
Parameters<typeof transactionDb.transaction>[0]
>[0];

function validDate(value: unknown): value is string {
if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
}

const date = new Date(`${value}T00:00:00.000Z`);

return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
);
}

function isOrderStatus(value: unknown): value is OrderStatus {
return (
    typeof value === "string" &&
    VALID_STATUSES.some((status) => status === value)
);
}

function validateItems(items: unknown): items is OrderItemInput[] {
if (!Array.isArray(items) || items.length === 0) {
    return false;
}

const ids = new Set<string>();

for (const item of items) {
    if (
    !item ||
    typeof item.id !== "string" ||
    !item.id.trim() ||
    ids.has(item.id) ||
    typeof item.productId !== "string" ||
    !item.productId.trim()
    ) {
    return false;
    }

    ids.add(item.id);

    const qty = Number(item.qty);
    const price = Number(item.price);
    const discount = Number(item.discount ?? 0);
    const unitCost = Number(item.unitCost);

    if (
    !Number.isSafeInteger(qty) ||
    qty <= 0 ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > price ||
    !Number.isFinite(unitCost) ||
    unitCost < 0
    ) {
    return false;
    }
}

return true;
}

function errorResponse(error: unknown, endpoint: string) {
if (error instanceof Error) {
    const errors: Record<
    string,
    { message: string; status: number }
    > = {
    CUSTOMER_NOT_FOUND: {
        message: "Customer not found for this business",
        status: 404,
    },
    PRODUCT_NOT_FOUND: {
        message: "One or more products were not found for this business",
        status: 404,
    },
    ORDER_NOT_FOUND: {
        message: "Order not found",
        status: 404,
    },
    ORDER_ID_EXISTS: {
        message: "Order ID already exists",
        status: 409,
    },
    INVALID_STATUS_TRANSITION: {
        message: "Invalid order status transition",
        status: 409,
    },
    DELIVERY_ALREADY_PROCESSED: {
        message: "Stock deduction for this order was already recorded",
        status: 409,
    },
    DELIVERED_ORDER_IMMUTABLE: {
        message:
        "Delivered orders cannot be edited or cancelled through this endpoint",
        status: 409,
    },
    INVALID_ITEMS: {
        message: "Order must contain at least one item",
        status: 400,
    },
    };

    const knownError = errors[error.message];

    if (knownError) {
    return NextResponse.json(
        { error: knownError.message },
        { status: knownError.status },
    );
    }
}

console.error(`${endpoint}:`, error);

return NextResponse.json(
    { error: "Order operation failed" },
    { status: 500 },
);
}

async function verifyProducts(
tx: DbTransaction,
businessId: string,
items: OrderItemInput[],
) {
const productIds = [...new Set(items.map((item) => item.productId))];

const matchingProducts = await tx
    .select({ id: products.id })
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
}

async function verifyCustomer(
tx: DbTransaction,
businessId: string,
customerId: string,
) {
const [customer] = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(
    and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId),
    ),
    );

if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
}
}

async function insertOrderItems(
tx: DbTransaction,
orderId: string,
items: OrderItemInput[],
) {
await tx.insert(orderItems).values(
    items.map((item) => ({
    id: item.id,
    orderId,
    productId: item.productId,
    qty: Number(item.qty),
    price: String(item.price),
    discount: String(item.discount ?? 0),
    unitCost: String(item.unitCost),
    })),
);
}

// GET /api/orders?businessId=BUS-0001
export async function GET(request: NextRequest) {
try {
    const businessId = request.nextUrl.searchParams.get("businessId");

    if (!businessId) {
    return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 },
    );
    }

    const orderRows = await transactionDb
    .select()
    .from(orders)
    .where(eq(orders.businessId, businessId));

    if (orderRows.length === 0) {
    return NextResponse.json([]);
    }

    const itemRows = await transactionDb
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderRows.map((order) => order.id)));

    return NextResponse.json(
    orderRows.map((order) => ({
        ...order,
        items: itemRows.filter((item) => item.orderId === order.id),
    })),
    );
} catch (error) {
    return errorResponse(error, "GET /api/orders");
}
}

// POST /api/orders
// Creating an order does not change stock.
export async function POST(request: NextRequest) {
try {
    const body = await request.json();

    const {
    id,
    businessId,
    date,
    customerId,
    status,
    dueDate,
    notes,
    items,
    } = body;

    if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof businessId !== "string" ||
    !businessId.trim() ||
    !validDate(date) ||
    typeof customerId !== "string" ||
    !customerId.trim() ||
    (dueDate != null && dueDate !== "" && !validDate(dueDate)) ||
    (status !== undefined && !isOrderStatus(status)) ||
    !validateItems(items)
    ) {
    return NextResponse.json(
        { error: "Order fields or items are invalid" },
        { status: 400 },
    );
    }

    if (status === "delivered" || status === "cancelled") {
    return NextResponse.json(
        {
        error:
            "New orders must start as requested or ready. Change status separately.",
        },
        { status: 400 },
    );
    }

    await transactionDb.transaction(async (tx) => {
    const [existing] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, id));

    if (existing) {
        throw new Error("ORDER_ID_EXISTS");
    }

    await verifyCustomer(tx, businessId, customerId);
    await verifyProducts(tx, businessId, items);

    await tx.insert(orders).values({
        id,
        businessId,
        date,
        customerId,
        status: status ?? "requested",
        dueDate: dueDate || null,
        notes: notes || null,
    });

    await insertOrderItems(tx, id, items);
    });

    return NextResponse.json(
    { message: "Order created successfully", id },
    { status: 201 },
    );
} catch (error) {
    return errorResponse(error, "POST /api/orders");
}
}

// PATCH /api/orders
// Required body fields: id, businessId.
// Optional fields: date, customerId, status, dueDate, notes, items.
export async function PATCH(request: NextRequest) {
try {
    const body = await request.json();

    const {
    id,
    businessId,
    date,
    customerId,
    status,
    dueDate,
    notes,
    items,
    } = body;

    if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof businessId !== "string" ||
    !businessId.trim()
    ) {
    return NextResponse.json(
        { error: "id and businessId are required" },
        { status: 400 },
    );
    }

    if (date !== undefined && !validDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    if (
    dueDate !== undefined &&
    dueDate !== null &&
    dueDate !== "" &&
    !validDate(dueDate)
    ) {
    return NextResponse.json(
        { error: "Invalid dueDate" },
        { status: 400 },
    );
    }

    if (status !== undefined && !isOrderStatus(status)) {
    return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
    );
    }

    if (items !== undefined && !validateItems(items)) {
    return NextResponse.json(
        { error: "Order items are invalid" },
        { status: 400 },
    );
    }

    await transactionDb.transaction(async (tx) => {
    const [current] = await tx
        .select()
        .from(orders)
        .where(
        and(
            eq(orders.id, id),
            eq(orders.businessId, businessId),
        ),
        )
        .for("update");

    if (!current) {
        throw new Error("ORDER_NOT_FOUND");
    }

    if (current.status === "delivered") {
        throw new Error("DELIVERED_ORDER_IMMUTABLE");
    }

    if (current.status === "cancelled") {
        throw new Error("INVALID_STATUS_TRANSITION");
    }

    const nextStatus: OrderStatus =
        status === undefined ? current.status : status;

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        requested: ["requested", "ready", "delivered", "cancelled"],
        ready: ["ready", "delivered", "cancelled"],
        delivered: ["delivered"],
        cancelled: ["cancelled"],
    };

    if (!allowedTransitions[current.status].includes(nextStatus)) {
        throw new Error("INVALID_STATUS_TRANSITION");
    }

    if (nextStatus === "cancelled" && items !== undefined) {
        throw new Error("INVALID_STATUS_TRANSITION");
    }

    if (customerId !== undefined) {
        if (typeof customerId !== "string" || !customerId.trim()) {
        throw new Error("CUSTOMER_NOT_FOUND");
        }

        await verifyCustomer(tx, businessId, customerId);
    }

    if (items !== undefined) {
        await verifyProducts(tx, businessId, items);
    }

    if (nextStatus === "delivered") {
        const currentItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

        if (currentItems.length === 0) {
        throw new Error("INVALID_ITEMS");
        }

        const reference = `order:${id}:sale`;

        const [existingSale] = await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(
            and(
            eq(stockMovements.businessId, businessId),
            eq(stockMovements.reference, reference),
            eq(stockMovements.type, "sale"),
            ),
        );

        if (existingSale) {
        throw new Error("DELIVERY_ALREADY_PROCESSED");
        }

        await tx.insert(stockMovements).values(
        currentItems.map((item) => ({
            id: `SM-SALE-${item.id}`,
            businessId,
            date: new Date().toISOString().slice(0, 10),
            productId: item.productId,
            type: "sale" as const,
            qty: -item.qty,
            reference,
        })),
        );
    }

    await tx
        .update(orders)
        .set({
        ...(date !== undefined ? { date } : {}),
        ...(customerId !== undefined ? { customerId } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        status: nextStatus,
        })
        .where(
        and(
            eq(orders.id, id),
            eq(orders.businessId, businessId),
        ),
        );

    if (items !== undefined) {
        await tx.delete(orderItems).where(eq(orderItems.orderId, id));
        await insertOrderItems(tx, id, items);
    }
    });

    return NextResponse.json({
    message: "Order updated successfully",
    id,
    });
} catch (error) {
    return errorResponse(error, "PATCH /api/orders");
}
}