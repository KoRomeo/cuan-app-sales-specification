import {
boolean,
date,
decimal,
integer,
jsonb,
pgEnum,
pgTable,
text,
timestamp,
uniqueIndex,
} from "drizzle-orm/pg-core"

// ============================================================
// ENUMS
// ============================================================

export const orderStatusEnum = pgEnum("order_status", [
"requested",
"ready",
"delivered",
"cancelled",
])

export const paymentStatusEnum = pgEnum("payment_status", [
"unpaid",
"partial",
"paid",
])

export const deliveryMethodEnum = pgEnum("delivery_method", [
"own",
"expedition",
"pickup",
])

export const movementTypeEnum = pgEnum("movement_type", [
"opening",
"purchase",
"sale",
"replacement",
"adjustment",
"reversal",
"unit",
])

// ============================================================
// BUSINESS
// ============================================================

export const businesses = pgTable("businesses", {
id: text("id").primaryKey(),
name: text("name").notNull(),
type: text("type").notNull(),
createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const businessMembers = pgTable("business_members", {
businessId: text("business_id").notNull(),
userId: text("user_id").notNull(),
role: text("role").notNull().default("owner"),
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const financialAccounts = pgTable("financial_accounts", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  accountNumber: text("account_number"),
  openingBalance: decimal("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  businessNameUnique: uniqueIndex("financial_accounts_business_name_idx").on(table.businessId, table.name),
}))


// ============================================================
// CUSTOMERS
// ============================================================

export const customers = pgTable(
"customers",
{
    id: text("id").primaryKey(),

    businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    phone: text("phone"),

    address: text("address"),

    location: text("location"),
},

(table) => [
    uniqueIndex("customers_business_name_idx").on(
    table.businessId,
    table.name,
    ),
],
)

// ============================================================
// SUPPLIERS
// ============================================================

export const suppliers = pgTable(
"suppliers",
{
    id: text("id").primaryKey(),
    businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contact: text("contact"),
},
(table) => [
    uniqueIndex("suppliers_business_name_idx").on(
    table.businessId,
    table.name,
    ),
],
)

// ============================================================
// PRODUCTS
// ============================================================

export const products = pgTable(
"products",
{
    id: text("id").primaryKey(),
    businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sellingPrice: decimal("selling_price", {
    precision: 14,
    scale: 2,
    }).notNull(),
    costReference: decimal("cost_reference", {
    precision: 14,
    scale: 2,
    }).notNull(),
    averageCost: decimal("average_cost", {
    precision: 14,
    scale: 2,
    }).notNull(),
    minimumStock: integer("minimum_stock").notNull().default(0),
},
(table) => [
    uniqueIndex("products_business_name_idx").on(
    table.businessId,
    table.name,
    ),
],
)

// ============================================================
// ORDERS
// ============================================================

export const orders = pgTable("orders", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
status: orderStatusEnum("status").notNull().default("requested"),
dueDate: date("due_date"),
notes: text("notes"),
createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// ============================================================
// ORDER ITEMS
// ============================================================

export const orderItems = pgTable("order_items", {
id: text("id").primaryKey(),
orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
productId: text("product_id")
    .notNull()
    .references(() => products.id),
qty: integer("qty").notNull(),
price: decimal("price", {
    precision: 14,
    scale: 2,
}).notNull(),
discount: decimal("discount", {
    precision: 14,
    scale: 2,
}).notNull().default("0"),
discountType: text("discount_type").notNull().default("amount"),
unitCost: decimal("unit_cost", {
    precision: 14,
    scale: 2,
}).notNull(),
})

// ============================================================
// DELIVERIES
// ============================================================

export const deliveries = pgTable("deliveries", {
id: text("id").primaryKey(),
orderId: text("order_id")
    .references(() => orders.id, { onDelete: "cascade" }),
date: date("date").notNull(),
method: deliveryMethodEnum("method").notNull(),
recipient: text("recipient").notNull(),
driverName: text("driver_name").notNull().default(""),
address: text("address").notNull(),
transportCost: decimal("transport_cost", {
    precision: 14,
    scale: 2,
}).notNull().default("0"),
transportAccount: text("transport_account").notNull().default("Cash"),
})

// One delivery can contain multiple orders. Legacy deliveries.orderId is retained for backward compatibility.
export const deliveryOrders = pgTable("delivery_orders", {
  deliveryId: text("delivery_id").notNull().references(() => deliveries.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
}, (table) => ({
  deliveryOrderUnique: uniqueIndex("delivery_orders_delivery_order_idx").on(table.deliveryId, table.orderId),
}))

// ============================================================
// PURCHASES
// ============================================================

export const purchases = pgTable("purchases", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
status: text("status").notNull().default("active"),
totalOverride: decimal("total_override", { precision: 14, scale: 2 }),
dueDate: date("due_date"),
notes: text("notes"),
createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// ============================================================
// PURCHASE ITEMS
// ============================================================

export const purchaseItems = pgTable("purchase_items", {
id: text("id").primaryKey(),
purchaseId: text("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
productId: text("product_id")
    .notNull()
    .references(() => products.id),
qty: integer("qty").notNull(),
unitCost: decimal("unit_cost", {
    precision: 14,
    scale: 2,
}).notNull(),
discount: decimal("discount", { precision: 14, scale: 2 }).notNull().default("0"),
discountType: text("discount_type").notNull().default("amount"),
})

// ============================================================
// PAYMENTS
// ============================================================

export const payments = pgTable("payments", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
orderId: text("order_id").references(() => orders.id, {
    onDelete: "cascade",
}),
purchaseId: text("purchase_id").references(() => purchases.id, {
    onDelete: "cascade",
}),
date: date("date").notNull(),
amount: decimal("amount", {
    precision: 14,
    scale: 2,
}).notNull(),
account: text("account").notNull(),
})

// ============================================================
// JOURNAL ENTRIES
// ============================================================

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  kind: text("kind").notNull(),
  reference: text("reference").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  businessKindReference: uniqueIndex("journal_entries_business_kind_reference_idx").on(table.businessId, table.kind, table.reference),
}))

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: text("id").primaryKey(),
  journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  account: text("account").notNull(),
  debit: decimal("debit", { precision: 14, scale: 2 }).notNull().default("0"),
  credit: decimal("credit", { precision: 14, scale: 2 }).notNull().default("0"),
})

// ============================================================
// REPLACEMENTS
// ============================================================

export const replacements = pgTable("replacements", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
productId: text("product_id")
    .notNull()
    .references(() => products.id),
qty: integer("qty").notNull(),
reason: text("reason").notNull(),
delivered: boolean("delivered").notNull().default(false),
})


// ============================================================
// CUSTOMER RETURNS
// ============================================================
export const returns = pgTable("returns", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id),
  date: date("date").notNull(),
  stockReturned: boolean("stock_returned").notNull().default(false),
  refundAmount: decimal("refund_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
export const returnItems = pgTable("return_items", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => returns.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  qty: integer("qty").notNull(),
  price: decimal("price", { precision: 14, scale: 2 }).notNull(),
})

// ============================================================
// EXPENSES
// ============================================================

export const expenses = pgTable("expenses", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
category: text("category").notNull(),
amount: decimal("amount", {
    precision: 14,
    scale: 2,
}).notNull(),
account: text("account").notNull(),
description: text("description").notNull(),
})

// ============================================================
// STOCK MOVEMENTS
// ============================================================

export const stockMovements = pgTable("stock_movements", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
productId: text("product_id")
    .notNull()
    .references(() => products.id),
type: movementTypeEnum("type").notNull(),
qty: integer("qty").notNull(),
reference: text("reference").notNull(),
})

// ============================================================
// AUDIT LOGS
// ============================================================

export const auditLogs = pgTable("audit_logs", {
id: text("id").primaryKey(),
businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
date: date("date").notNull(),
time: text("time").notNull(),
page: text("page").notNull(),
action: text("action").notNull(),
userId: text("user_id"),
reference: text("reference").notNull(),
})

// ============================================================
// AUDIT LOG CHANGES
// ============================================================

export const auditLogChanges = pgTable("audit_log_changes", {
  id: text("id").primaryKey(),
  auditLogId: text("audit_log_id")
    .notNull()
    .references(() => auditLogs.id, { onDelete: "cascade" }),
  property: text("property").notNull(),
  previous: text("previous"),
  current: text("current"),
})

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
})


// ============================================================
// UNITS (split / combine between two products, e.g. dus <-> pcs)
// ============================================================

export const unitRules = pgTable("unit_rules", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  bigProductId: text("big_product_id").notNull().references(() => products.id),
  smallProductId: text("small_product_id").notNull().references(() => products.id),
  ratio: integer("ratio").notNull(),
  status: text("status").notNull().default("active"),
  note: text("note"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const unitOperations = pgTable("unit_operations", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").notNull().references(() => unitRules.id),
  type: text("type").notNull(),
  sourceProductId: text("source_product_id").notNull().references(() => products.id),
  targetProductId: text("target_product_id").notNull().references(() => products.id),
  qtyOut: integer("qty_out").notNull(),
  qtyIn: integer("qty_in").notNull(),
  valueMoved: decimal("value_moved", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})


// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  kind: text("kind").notNull(),
  entityId: text("entity_id"),
  payload: jsonb("payload").$type<Record<string, string | number | null>>().notNull().default({}),
  href: text("href").notNull(),
  priority: text("priority").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  businessUserCreated: index("notifications_business_user_created_idx").on(table.businessId, table.userId, table.createdAt),
  businessUserActive: index("notifications_business_user_active_idx").on(table.businessId, table.userId, table.resolvedAt),
}))

// ============================================================
// PURCHASE DOCUMENTS (private invoice originals + AI review state)
// ============================================================
export const purchaseDocuments = pgTable("purchase_documents", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  blobPathname: text("blob_pathname").notNull(),
  previewBlobPathname: text("preview_blob_pathname"),
  previewFileSize: integer("preview_file_size"),
  status: text("status").notNull().default("queued"),
  targetType: text("target_type").notNull().default("purchase"),
  extractedData: jsonb("extracted_data").$type<Record<string, unknown> | null>(),
  confidence: integer("confidence"),
  reviewIssues: jsonb("review_issues").$type<string[]>().notNull().default([]),
  purchaseId: text("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
})
