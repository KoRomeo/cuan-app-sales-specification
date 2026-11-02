import { eq } from "drizzle-orm"
import { db } from "./index"
import {
customers,
products,
suppliers,
orders,
orderItems,
payments,
} from "./schema"

export async function getCustomers() {
return db.select().from(customers)
}

export async function getSuppliers() {
return db.select().from(suppliers)
}

export async function getProducts() {
return db.select().from(products)
}

export async function getCustomerById(id: string) {
const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))

return result[0] ?? null
}

export async function getSupplierById(id: string) {
const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))

return result[0] ?? null
}

export async function getProductById(id: string) {
const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))

return result[0] ?? null
}

export async function getCustomersWithStats() {
const customerRows = await db.select().from(customers)
const orderRows = await db.select().from(orders)
const orderItemRows = await db.select().from(orderItems)
const paymentRows = await db.select().from(payments)

return customerRows.map((customer) => {
    const customerOrders = orderRows.filter(
    (order) =>
        order.customerId === customer.id &&
        order.status !== "cancelled",
    )

    const customerOrderIds = new Set(
    customerOrders.map((order) => order.id),
    )

    const lifetime = orderItemRows
    .filter((item) => customerOrderIds.has(item.orderId))
    .reduce((total, item) => {
        const price = Number(item.price)
        const discount = Number(item.discount)
        return total + (price - discount) * item.qty
    }, 0)

    const paid = paymentRows
    .filter(
        (payment) =>
        payment.orderId !== null &&
        customerOrderIds.has(payment.orderId),
    )
    .reduce((total, payment) => total + Number(payment.amount), 0)

    const outstanding = Math.max(lifetime - paid, 0)

    const lastOrder =
    [...customerOrders]
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

    return {
    customer,
    orders: customerOrders.length,
    lifetime,
    outstanding,
    lastOrder,
    }
})
}