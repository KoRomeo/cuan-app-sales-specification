import { pgTable, foreignKey, text, integer, numeric, uniqueIndex, date, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const deliveryMethod = pgEnum("delivery_method", ['own', 'expedition', 'pickup'])
export const movementType = pgEnum("movement_type", ['opening', 'purchase', 'sale', 'replacement', 'adjustment', 'reversal'])
export const orderStatus = pgEnum("order_status", ['requested', 'ready', 'delivered', 'cancelled'])
export const paymentStatus = pgEnum("payment_status", ['unpaid', 'partial', 'paid'])


export const orderItems = pgTable("order_items", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	productId: text("product_id").notNull(),
	qty: integer().notNull(),
	price: numeric({ precision: 14, scale:  2 }).notNull(),
	discount: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	unitCost: numeric("unit_cost", { precision: 14, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	name: text().notNull(),
	sellingPrice: numeric("selling_price", { precision: 14, scale:  2 }).notNull(),
	costReference: numeric("cost_reference", { precision: 14, scale:  2 }).notNull(),
	averageCost: numeric("average_cost", { precision: 14, scale:  2 }).notNull(),
	minimumStock: integer("minimum_stock").default(0).notNull(),
}, (table) => [
	uniqueIndex("products_business_name_idx").using("btree", table.businessId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "products_business_id_businesses_id_fk"
		}).onDelete("cascade"),
]);

export const payments = pgTable("payments", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	orderId: text("order_id"),
	purchaseId: text("purchase_id"),
	date: date().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	account: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "payments_business_id_businesses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.purchaseId],
			foreignColumns: [purchases.id],
			name: "payments_purchase_id_purchases_id_fk"
		}).onDelete("cascade"),
]);

export const purchases = pgTable("purchases", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	supplierId: text("supplier_id").notNull(),
	dueDate: date("due_date"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "purchases_business_id_businesses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchases_supplier_id_suppliers_id_fk"
		}),
]);

export const purchaseItems = pgTable("purchase_items", {
	id: text().primaryKey().notNull(),
	purchaseId: text("purchase_id").notNull(),
	productId: text("product_id").notNull(),
	qty: integer().notNull(),
	unitCost: numeric("unit_cost", { precision: 14, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.purchaseId],
			foreignColumns: [purchases.id],
			name: "purchase_items_purchase_id_purchases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "purchase_items_product_id_products_id_fk"
		}),
]);

export const suppliers = pgTable("suppliers", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	name: text().notNull(),
	contact: text(),
}, (table) => [
	uniqueIndex("suppliers_business_name_idx").using("btree", table.businessId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "suppliers_business_id_businesses_id_fk"
		}).onDelete("cascade"),
]);

export const replacements = pgTable("replacements", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	orderId: text("order_id").notNull(),
	productId: text("product_id").notNull(),
	qty: integer().notNull(),
	reason: text().notNull(),
	delivered: boolean().default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "replacements_business_id_businesses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "replacements_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "replacements_product_id_products_id_fk"
		}),
]);

export const stockMovements = pgTable("stock_movements", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	productId: text("product_id").notNull(),
	type: movementType().notNull(),
	qty: integer().notNull(),
	reference: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "stock_movements_business_id_businesses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "stock_movements_product_id_products_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	time: text().notNull(),
	page: text().notNull(),
	action: text().notNull(),
	userId: text("user_id"),
	reference: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "audit_logs_business_id_businesses_id_fk"
		}).onDelete("cascade"),
]);

export const auditLogChanges = pgTable("audit_log_changes", {
	id: text().primaryKey().notNull(),
	auditLogId: text("audit_log_id").notNull(),
	property: text().notNull(),
	previous: text(),
	current: text(),
}, (table) => [
	foreignKey({
			columns: [table.auditLogId],
			foreignColumns: [auditLogs.id],
			name: "audit_log_changes_audit_log_id_audit_logs_id_fk"
		}).onDelete("cascade"),
]);

export const businesses = pgTable("businesses", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	name: text().notNull(),
	location: text().notNull(),
}, (table) => [
	uniqueIndex("customers_business_name_idx").using("btree", table.businessId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customers_business_id_businesses_id_fk"
		}).onDelete("cascade"),
]);

export const orders = pgTable("orders", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	customerId: text("customer_id").notNull(),
	status: orderStatus().default('requested').notNull(),
	dueDate: date("due_date"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "orders_business_id_businesses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_customers_id_fk"
		}),
]);

export const deliveries = pgTable("deliveries", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	date: date().notNull(),
	method: deliveryMethod().notNull(),
	recipient: text().notNull(),
	address: text().notNull(),
	transportCost: numeric("transport_cost", { precision: 14, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "deliveries_order_id_orders_id_fk"
		}).onDelete("cascade"),
]);

export const expenses = pgTable("expenses", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	date: date().notNull(),
	category: text().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	account: text().notNull(),
	description: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "expenses_business_id_businesses_id_fk"
		}).onDelete("cascade"),
]);
