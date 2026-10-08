import dotenv from "dotenv"
import { sql } from "drizzle-orm"
import { db } from "../lib/db"
import {
businesses,
customers,
suppliers,
products,
orders,
orderItems,
deliveries,
purchases,
purchaseItems,
payments,
replacements,
expenses,
stockMovements,
auditLogs,
auditLogChanges,
} from "../lib/db/schema"

import {
customers as mockCustomers,
suppliers as mockSuppliers,
products as mockProducts,
orders as mockOrders,
purchases as mockPurchases,
replacements as mockReplacements,
expenses as mockExpenses,
stockMovements as mockStockMovements,
history as mockHistory,
} from "../lib/data"

dotenv.config({ path: ".env.development.local" })

const BUSINESS_ID = "BUS-0001"

async function seed() {
console.log("🌱 Starting seed...")

// --------------------------------------------------
// 1. BUSINESS
// --------------------------------------------------

await db
    .insert(businesses)
    .values({
    id: BUSINESS_ID,
    name: "CuanApp Sales",
    type: "sales",
    })
    .onConflictDoNothing()

// --------------------------------------------------
// 2. CUSTOMERS
// --------------------------------------------------

if (mockCustomers.length > 0) {
    await db
    .insert(customers)
    .values(
        mockCustomers.map((customer) => ({
        id: customer.id,
        businessId: BUSINESS_ID,
        name: customer.name,
        phone: customer.phone ?? null,
        address: customer.address ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 3. SUPPLIERS
// --------------------------------------------------

if (mockSuppliers.length > 0) {
    await db
    .insert(suppliers)
    .values(
        mockSuppliers.map((supplier) => ({
        id: supplier.id,
        businessId: BUSINESS_ID,
        name: supplier.name,
        phone: supplier.phone ?? null,
        address: supplier.address ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 4. PRODUCTS
// --------------------------------------------------

if (mockProducts.length > 0) {
    await db
    .insert(products)
    .values(
        mockProducts.map((product) => ({
        id: product.id,
        businessId: BUSINESS_ID,
        name: product.name,
        sellingPrice: String(product.sellingPrice),
        costReference: String(product.costReference),
        averageCost: String(product.averageCost),
        minimumStock: product.minimumStock,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 5. ORDERS
// --------------------------------------------------

if (mockOrders.length > 0) {
    await db
    .insert(orders)
    .values(
        mockOrders.map((order) => ({
        id: order.id,
        businessId: BUSINESS_ID,
        date: order.date,
        customerId: order.customerId,
        status: order.status,
        dueDate: order.dueDate ?? null,
        notes: order.notes ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 6. ORDER ITEMS
// --------------------------------------------------

const allOrderItems = mockOrders.flatMap((order) =>
    order.items.map((item, index) => ({
    id: `${order.id}-ITEM-${String(index + 1).padStart(3, "0")}`,
    orderId: order.id,
    productId: item.productId,
    qty: item.qty,
    price: String(item.price),
    discount: String(item.discount),
    unitCost: String(item.unitCost),
    })),
)

if (allOrderItems.length > 0) {
    await db
    .insert(orderItems)
    .values(allOrderItems)
    .onConflictDoNothing()
}

// --------------------------------------------------
// 7. DELIVERIES
// --------------------------------------------------

const deliveriesToInsert = mockOrders
    .filter((order) => order.delivery)
    .map((order) => ({
    id: order.delivery!.id,
    businessId: BUSINESS_ID,
    orderId: order.id,
    date: order.delivery!.date,
    method: order.delivery!.method,
    recipient: order.delivery!.recipient,
    address: order.delivery!.address,
    transportCost: String(order.delivery!.transportCost),
    }))

if (deliveriesToInsert.length > 0) {
    await db
    .insert(deliveries)
    .values(deliveriesToInsert)
    .onConflictDoNothing()
}

// --------------------------------------------------
// 8. PURCHASES
// --------------------------------------------------

if (mockPurchases.length > 0) {
    await db
    .insert(purchases)
    .values(
        mockPurchases.map((purchase) => ({
        id: purchase.id,
        businessId: BUSINESS_ID,
        date: purchase.date,
        supplierId: purchase.supplierId,
        dueDate: purchase.dueDate ?? null,
        notes: purchase.notes ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 9. PURCHASE ITEMS
// --------------------------------------------------

const allPurchaseItems = mockPurchases.flatMap((purchase) =>
    purchase.items.map((item, index) => ({
    id: `${purchase.id}-ITEM-${String(index + 1).padStart(3, "0")}`,
    purchaseId: purchase.id,
    productId: item.productId,
    qty: item.qty,
    unitCost: String(item.price),
    })),
)

if (allPurchaseItems.length > 0) {
    await db
    .insert(purchaseItems)
    .values(allPurchaseItems)
    .onConflictDoNothing()
}

// --------------------------------------------------
// 10. PAYMENTS
// --------------------------------------------------

const orderPayments = mockOrders.flatMap((order) =>
    order.payments.map((payment) => ({
    id: payment.id,
    businessId: BUSINESS_ID,
    orderId: order.id,
    purchaseId: null,
    date: payment.date,
    amount: String(payment.amount),
    account: payment.account,
    })),
)

const purchasePayments = mockPurchases.flatMap((purchase) =>
    purchase.payments.map((payment) => ({
    id: payment.id,
    businessId: BUSINESS_ID,
    orderId: null,
    purchaseId: purchase.id,
    date: payment.date,
    amount: String(payment.amount),
    account: payment.account,
    })),
)

const allPayments = [...orderPayments, ...purchasePayments]

if (allPayments.length > 0) {
    await db
    .insert(payments)
    .values(allPayments)
    .onConflictDoNothing()
}

// --------------------------------------------------
// 11. REPLACEMENTS
// --------------------------------------------------

if (mockReplacements.length > 0) {
    await db
    .insert(replacements)
    .values(
        mockReplacements.map((replacement) => ({
        id: replacement.id,
        businessId: BUSINESS_ID,
        date: replacement.date,
        orderId: replacement.orderId,
        productId: replacement.productId,
        qty: replacement.qty,
        reason: replacement.reason,
        delivered: replacement.delivered,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 12. EXPENSES
// --------------------------------------------------

if (mockExpenses.length > 0) {
    await db
    .insert(expenses)
    .values(
        mockExpenses.map((expense) => ({
        id: expense.id,
        businessId: BUSINESS_ID,
        date: expense.date,
        category: expense.category,
        amount: String(expense.amount),
        account: expense.account,
        description: expense.description ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 13. STOCK MOVEMENTS
// --------------------------------------------------

if (mockStockMovements.length > 0) {
    await db
    .insert(stockMovements)
    .values(
        mockStockMovements.map((movement) => ({
        id: movement.id,
        businessId: BUSINESS_ID,
        date: movement.date,
        productId: movement.productId,
        type: movement.type,
        qty: movement.qty,
        reference: movement.reference ?? null,
        })),
    )
    .onConflictDoNothing()
}

// --------------------------------------------------
// 14. AUDIT LOGS
// --------------------------------------------------

for (const record of mockHistory) {
    await db
    .insert(auditLogs)
    .values({
        id: record.id,
        businessId: BUSINESS_ID,
        date: record.date,
        time: record.time,
        page: record.page,
        action: record.action,
        userId: record.user,
        reference: record.reference ?? null,
    })
    .onConflictDoNothing()

    if (record.changes?.length) {
    await db
        .insert(auditLogChanges)
        .values(
        record.changes.map((change, index) => ({
            id: `${record.id}-CHANGE-${String(index + 1).padStart(3, "0")}`,
            auditLogId: record.id,
            property: change.property,
            previous: change.previous ?? null,
            current: change.current ?? null,
        })),
        )
        .onConflictDoNothing()
    }
}

console.log("✅ Seed completed successfully.")
}

seed()
.catch((error) => {
    console.error("❌ Seed failed:")
    console.error(error)
    process.exit(1)
})