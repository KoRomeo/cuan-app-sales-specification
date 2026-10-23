import { relations } from "drizzle-orm/relations";
import { orders, orderItems, products, businesses, payments, purchases, suppliers, purchaseItems, replacements, stockMovements, auditLogs, auditLogChanges, customers, deliveries, expenses } from "./schema";

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	payments: many(payments),
	replacements: many(replacements),
	business: one(businesses, {
		fields: [orders.businessId],
		references: [businesses.id]
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	deliveries: many(deliveries),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	business: one(businesses, {
		fields: [products.businessId],
		references: [businesses.id]
	}),
	purchaseItems: many(purchaseItems),
	replacements: many(replacements),
	stockMovements: many(stockMovements),
}));

export const businessesRelations = relations(businesses, ({many}) => ({
	products: many(products),
	payments: many(payments),
	purchases: many(purchases),
	suppliers: many(suppliers),
	replacements: many(replacements),
	stockMovements: many(stockMovements),
	auditLogs: many(auditLogs),
	customers: many(customers),
	orders: many(orders),
	expenses: many(expenses),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	business: one(businesses, {
		fields: [payments.businessId],
		references: [businesses.id]
	}),
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
	purchase: one(purchases, {
		fields: [payments.purchaseId],
		references: [purchases.id]
	}),
}));

export const purchasesRelations = relations(purchases, ({one, many}) => ({
	payments: many(payments),
	business: one(businesses, {
		fields: [purchases.businessId],
		references: [businesses.id]
	}),
	supplier: one(suppliers, {
		fields: [purchases.supplierId],
		references: [suppliers.id]
	}),
	purchaseItems: many(purchaseItems),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	purchases: many(purchases),
	business: one(businesses, {
		fields: [suppliers.businessId],
		references: [businesses.id]
	}),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({one}) => ({
	purchase: one(purchases, {
		fields: [purchaseItems.purchaseId],
		references: [purchases.id]
	}),
	product: one(products, {
		fields: [purchaseItems.productId],
		references: [products.id]
	}),
}));

export const replacementsRelations = relations(replacements, ({one}) => ({
	business: one(businesses, {
		fields: [replacements.businessId],
		references: [businesses.id]
	}),
	order: one(orders, {
		fields: [replacements.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [replacements.productId],
		references: [products.id]
	}),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
	business: one(businesses, {
		fields: [stockMovements.businessId],
		references: [businesses.id]
	}),
	product: one(products, {
		fields: [stockMovements.productId],
		references: [products.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one, many}) => ({
	business: one(businesses, {
		fields: [auditLogs.businessId],
		references: [businesses.id]
	}),
	auditLogChanges: many(auditLogChanges),
}));

export const auditLogChangesRelations = relations(auditLogChanges, ({one}) => ({
	auditLog: one(auditLogs, {
		fields: [auditLogChanges.auditLogId],
		references: [auditLogs.id]
	}),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	business: one(businesses, {
		fields: [customers.businessId],
		references: [businesses.id]
	}),
	orders: many(orders),
}));

export const deliveriesRelations = relations(deliveries, ({one}) => ({
	order: one(orders, {
		fields: [deliveries.orderId],
		references: [orders.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one}) => ({
	business: one(businesses, {
		fields: [expenses.businessId],
		references: [businesses.id]
	}),
}));