# CuanApp ERD & Database Schema — Archived Master

> This document preserves the original master-level ERD and schema design. It includes proposed fields and tables, not a claim that every table exists in the current database. Compare with `08_Current_Project_Status.md` before making migrations.

27. ERD — Master Level

Sekarang ERD-nya mulai bisa dibentuk.

ACCOUNT  
│  
├── USER  
│  
└── BUSINESS  
│  
├── BUSINESS_TYPE  
│  
├── BUSINESS_SETTINGS  
│  
├── FEATURE_SETTINGS  
│  
├── PRODUCTS  
│ │  
│ └── STOCK_MOVEMENTS  
│  
├── CUSTOMERS  
│ │  
│ └── ORDERS  
│ │  
│ ├── ORDER_ITEMS  
│ ├── PAYMENTS  
│ ├── DELIVERIES  
│ │ └── DELIVERY_ITEMS  
│ │  
│ ├── INVOICES  
│ └── REPLACEMENTS  
│  
├── SUPPLIERS  
│ │  
│ └── PURCHASES  
│ │  
│ ├── PURCHASE_ITEMS  
│ └── PAYMENTS  
│  
├── EXPENSES  
│  
├── EXPENSE_CATEGORIES  
│  
├── FINANCIAL_ACCOUNTS  
│  
├── CHART_OF_ACCOUNTS  
│  
├── JOURNAL_ENTRIES  
│ └── JOURNAL_ENTRY_LINES  
│  
└── AUDIT_LOGS  
28. Relasi paling penting  
Account  
1  
│  
└──< Business

Business  
1  
├──< Product  
├──< Customer  
├──< Supplier  
├──< Order  
├──< Purchase  
├──< Expense  
└──< AuditLog

Order:

Order  
1  
├──< OrderItem  
├──< Payment  
├──< Delivery  
├── Invoice  
└──< Replacement

Purchase:

Purchase  
1  
├──< PurchaseItem  
└──< Payment

Product:

Product  
1  
└──< StockMovement  
29. Hal yang sengaja TIDAK kita buat

Supaya V1 tidak menjadi monster:

❌ Product Image  
❌ Product Category  
❌ Product Description  
❌ Complex Role Management  
❌ Multiple Currency  
❌ Tracking Number  
❌ Partial Order  
❌ Customer Request entity  
❌ Separate Return Types  
❌ Rigid stock blocking

Tetapi arsitekturnya tetap memungkinkan fitur tersebut ditambahkan nanti.

30. Design Direction

Sekarang visualnya.

Bukan Cetakku.

CuanApp:

Visual personality

Modern Fintech × Corporate Business Software

Karakter:

Clean  
Premium  
Structured  
Trustworthy  
Data-focused  
Modern  
Slightly futuristic  
Theme  
Light Mode  
Dark Mode  
Color direction

Base:

Deep Navy / Dark Blue

Accent:

Blue

Status:

Success  
Warning  
Danger  
Neutral

Tidak menggunakan terlalu banyak warna.

31. Layout system

Desktop-first karena aplikasi ini banyak menggunakan table.

┌──────────────────────────────────────────────────────────┐  
│ Sidebar │ Topbar │  
│ ├───────────────────────────────────────────────┤  
│ │ Breadcrumb │  
│ │ Page Title │  
│ │ Description │  
│ │ │  
│ │ Summary / KPI Cards │  
│ │ │  
│ │ Filters / Search / Actions │  
│ │ │  
│ │ Data Table │  
│ │ │  
│ │ Pagination │  
└─────────┴───────────────────────────────────────────────┘

Top-left:

[CUANAPP]

dengan logo.

Top navigation dapat memiliki:

Business selector  
Notifications  
Theme  
Profile  
32. Breadcrumb

Seperti yang kamu inginkan, tetapi dibuat lebih modern.

Orders / ORD-202610-0001

atau:

Orders / Toko ABC / Order #ORD-001

Jadi user selalu tahu posisinya.

33. Standard Table

Semua table besar menggunakan pola:

[Search................] [Filter] [Sort] [Columns] [+ Add]

────────────────────────────────────────────────────

Data

────────────────────────────────────────────────────

Showing 1–20 of 128 < 1 2 3 >

Row actions:

View  
Edit  
Delete  
More

Contextual navigation tetap tersedia.

34. Product Page

Summary:

Total Products  
Low Stock  
Negative Stock  
Total Inventory Value

Table:

Product ID  
Product  
Selling Price  
Average Cost  
Stock  
Minimum Stock  
Margin  
Actions

Tidak ada image/category.

35. Order Page

Summary:

Total Orders  
Requested  
Ready to Deliver  
Delivered  
Outstanding Payment

Table:

Order ID  
Date  
Customer  
Status  
Payment Status  
Total  
Delivery  
Actions

Filter:

Status  
Payment Status  
Date  
Customer  
Negative Stock Impact  
36. Order Detail

Header:

Orders / ORD-001

ORD-001  
Toko ABC  
Requested

[Edit] [Cancel] [More]

Sections:

Order Information

Customer  
Order Date  
Status  
Payment Status

Order Items

Product  
Qty  
Selling Price  
Discount  
Subtotal

Payment Summary

Total  
Paid  
Outstanding

Delivery

Delivery Status  
Method  
Transport Cost

Notes  
37. Purchase Page

Summary:

Purchases  
Outstanding Payables  
Total Purchased  
This Period

Table:

Purchase ID  
Date  
Supplier  
Items  
Total  
Paid  
Outstanding  
Payment Status  
Actions  
38. Stock Page

Ini salah satu page penting.

Summary:

Total Products  
Inventory Value  
Low Stock  
Negative Stock

Table:

Product  
Current Stock  
Average Cost  
Inventory Value  
Minimum Stock  
Stock Status

Negative stock harus sangat mudah difilter:

[All] [Low Stock] [Negative Stock]  
39. History Page

Main table seperti yang kamu minta:

Record ID  
Date  
Time  
Page  
Action

Klik row:

History Detail

Kemudian:

Property  
Previous Value  
Current Value  
40. Onboarding

Setelah login:

Login  
↓  
Account  
↓  
Business Selection  
↓  
Choose Business Type  
↓  
Business Setup  
↓  
Feature Configuration  
↓  
Dashboard

Untuk Sales:

Business Name  
Business Address  
Currency  
Inventory  
Costing Method  
Delivery  
Expedition  
Employees  
Customer Payment  
Supplier Payment  
Accounting

Currency:

IDR dipilih pada awal setup dan tidak dapat diubah.

41. Feature Configuration

Settings:

Business Settings  
────────────────────────────

Inventory  
[ON]

Purchasing  
[ON]

Customer Credit  
[ON]

Supplier Credit  
[ON]

Own Delivery  
[ON]

Expedition  
[ON]

Employees  
[ON]

Accounting  
[ON]

Mematikan fitur:

UI → hide  
Backend → disable  
Access → blocked

Bukan sekadar menyembunyikan menu.

42. Teknologi yang akan menjadi target

Karena sebelumnya kamu memilih jalur:

Framer / v0  
↓  
React  
↓  
Inertia.js  
↓  
Laravel  
↓  
MySQL

maka specification ini dirancang agar cocok dengan stack tersebut.

v0 akan kita gunakan terutama untuk:

UI implementation / frontend generation

bukan sebagai sumber business logic.

Laravel nantinya menangani:

Authentication  
Authorization  
Business rules  
Transactions  
Stock  
Accounting  
Audit logs  
Database

React menangani:

UI  
Components  
Tables  
Forms  
Interactions  
Charts  
Modals

Inertia menjadi bridge.

43. Struktur aplikasi

Secara konsep:

CUANAPP  
│  
├── Authentication  
│  
├── Business Context  
│  
├── Dashboard  
│  
├── Sales  
│ ├── Orders  
│ ├── Customers  
│ ├── Invoices  
│ ├── Deliveries  
│ └── Returns  
│  
├── Purchasing  
│  
├── Inventory  
│  
├── Finance  
│  
├── Reports  
│  
├── Activity  
│  
└── Settings  
44. MASTER USER FLOW  
LOGIN  
↓  
SELECT BUSINESS  
↓  
DASHBOARD  
│  
├── SALES  
│ ├── Orders  
│ │ ├── Create  
│ │ ├── Edit  
│ │ ├── Delivery  
│ │ ├── Invoice  
│ │ └── Payment  
│ │  
│ ├── Customers  
│ ├── Invoices  
│ ├── Deliveries  
│ └── Returns  
│  
├── PURCHASING  
│ ├── Purchases  
│ └── Suppliers  
│  
├── INVENTORY  
│ ├── Products  
│ ├── Stock  
│ └── Stock Movements  
│  
├── FINANCE  
│ ├── Receivables  
│ ├── Payables  
│ ├── Expenses  
│ └── P&L  
│  
├── REPORTS  
│  
├── HISTORY  
│  
└── SETTINGS  
45. Ini sekarang status kesiapan kita

Saya akan nilai:

Komponen Status  
Business concept ✅ 100%  
Core workflow ✅ 100%  
Order logic ✅ 100%  
Stock logic ✅ 100%  
Purchase ✅ 100%  
Customer ✅ 100%  
Supplier ✅ 100%  
Payment ✅ 100%  
Delivery ✅ 100%  
Replacement ✅ 100%  
Invoice ✅ 100%  
History ✅ 100%  
Delete/Restore ✅ 100%  
Accounting concept ✅ 95%  
Information Architecture ✅ 100%  
UX structure ✅ 95%  
Visual direction ✅ 90%  
ERD 🟡 Master-level  
Exact database fields 🟡 Next  
v0 prompt 🟡 Next

Overall: sekitar 95%.

Yang tersisa bukan lagi keputusan bisnis besar. Yang tersisa adalah technical specification.

46. Urutan berikutnya

Saya tidak menyarankan langsung memberi v0 prompt.

Kita harus membuat 3 dokumen teknis terakhir:

A. Final ERD

Bukan lagi:

Product → Order

tetapi sampai:

accounts  
users  
businesses  
business_types  
business_settings  
products  
customers  
suppliers  
orders  
order_items  
purchases  
purchase_items  
payments  
deliveries  
delivery_items  
invoices  
replacements  
stock_movements  
expenses  
expense_categories  
financial_accounts  
chart_of_accounts  
journal_entries  
journal_entry_lines  
audit_logs  
...

lengkap dengan:

PK  
FK  
nullable  
data type  
relationship  
cascade/restrict behavior  
soft delete  
indexes  
B. Screen Specification

Setiap page akan saya tulis field-by-field, misalnya:

/orders/create

Header  
Breadcrumb  
Customer  
Order Date  
Items  
Product  
Quantity  
Selling Price  
Discount  
Subtotal  
Notes  
Summary  
Subtotal  
Discount  
Tax  
Total  
Actions

termasuk semua state:

Loading  
Empty  
Error  
Success  
Negative stock  
Unsaved changes  
Delete  
Restore

C. DATABASE ARCHITECTURE — ERD & SCHEMA

---

# C1–C4. Full Database Architecture Appendix

C1. Core ERD  
ACCOUNT  
│  
├──< BUSINESS  
│ │  
│ ├── BUSINESS_TYPE  
│ ├── BUSINESS_SETTINGS  
│ ├── BUSINESS_FEATURES  
│ │  
│ ├──< BUSINESS_USERS >── ACCOUNT  
│ │  
│ ├──< PRODUCTS  
│ │ └──< STOCK_MOVEMENTS  
│ │  
│ ├──< CUSTOMERS  
│ │ └──< ORDERS  
│ │ ├──< ORDER_ITEMS >── PRODUCTS  
│ │ ├──< DELIVERIES  
│ │ │ └──< DELIVERY_ITEMS >── ORDER_ITEMS  
│ │ ├──< INVOICES  
│ │ └──< REPLACEMENTS  
│ │ └──< REPLACEMENT_ITEMS >── PRODUCTS  
│ │  
│ ├──< SUPPLIERS  
│ │ └──< PURCHASES  
│ │ └──< PURCHASE_ITEMS >── PRODUCTS  
│ │  
│ ├──< PAYMENTS  
│ │ └──< PAYMENT_ALLOCATIONS  
│ │  
│ ├──< EXPENSE_CATEGORIES  
│ │ └──< EXPENSES  
│ │  
│ ├──< FINANCIAL_ACCOUNTS  
│ │  
│ ├──< CHART_OF_ACCOUNTS  
│ │ └──< JOURNAL_ENTRY_LINES  
│ │  
│ ├──< JOURNAL_ENTRIES  
│ │ └──< JOURNAL_ENTRY_LINES  
│ │  
│ └──< AUDIT_LOGS  
C2. Database Schema

1. accounts

Authentication identity.

Field Type Notes  
id BIGINT PK  
name VARCHAR Account owner name  
email VARCHAR UNIQUE  
password VARCHAR Hashed  
language VARCHAR en / id  
created_at TIMESTAMP  
updated_at TIMESTAMP  
2. businesses

One account can own multiple businesses.

Field Type Notes  
id BIGINT PK  
account_id BIGINT FK → accounts  
business_type_id BIGINT FK  
name VARCHAR  
currency VARCHAR V1 = IDR  
timezone VARCHAR  
status VARCHAR active/inactive  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP Soft delete  
3. business_types  
Field Type Notes  
id BIGINT PK  
code VARCHAR sales, bakery, barber  
name VARCHAR  
description TEXT  
4. business_users

Connects accounts to businesses and prepares for future multi-user support.

Field Type Notes  
id BIGINT PK  
business_id BIGINT FK  
account_id BIGINT FK  
role VARCHAR V1 = owner  
status VARCHAR  
created_at TIMESTAMP

Unique: (business_id, account_id)

5. business_settings  
    Field Type Notes  
    id BIGINT PK  
    business_id BIGINT FK  
    language VARCHAR  
    currency VARCHAR  
    timezone VARCHAR  
    minimum_stock_enabled BOOLEAN  
    negative_stock_enabled BOOLEAN  
    customer_credit_enabled BOOLEAN  
    supplier_credit_enabled BOOLEAN  
    delivery_enabled BOOLEAN  
    accounting_enabled BOOLEAN  
    created_at TIMESTAMP  
    updated_at TIMESTAMP
6. business_features

Flexible feature flags.

Field Type Notes  
id BIGINT PK  
business_id BIGINT FK  
feature_key VARCHAR  
enabled BOOLEAN

Unique: (business_id, feature_key)

Inventory  
7. products  
Field Type Notes  
id BIGINT PK  
business_id BIGINT FK  
product_code VARCHAR e.g. P0001  
name VARCHAR  
selling_price DECIMAL Default/reference price  
average_cost DECIMAL Moving weighted average  
minimum_stock DECIMAL  
current_stock DECIMAL Cached stock  
status VARCHAR  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP

Unique: (business_id, product_code)

8. stock_movements

Source of truth for inventory history.

Field Type Notes  
id BIGINT PK  
business_id BIGINT FK  
product_id BIGINT FK  
movement_type VARCHAR purchase/sale/replacement/adjustment/etc.  
reference_type VARCHAR order/purchase/etc.  
reference_id BIGINT Related record  
quantity DECIMAL Positive/negative  
unit_cost DECIMAL  
total_cost DECIMAL  
stock_before DECIMAL  
stock_after DECIMAL  
created_by BIGINT FK → accounts  
created_at TIMESTAMP

Negative stock is allowed when enabled.

Sales  
9. customers  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
customer_code VARCHAR  
name VARCHAR  
phone VARCHAR  
email VARCHAR  
address TEXT  
notes TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
10. orders  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
customer_id BIGINT FK  
order_number VARCHAR  
order_date DATE  
status VARCHAR  
payment_status VARCHAR  
subtotal DECIMAL  
discount DECIMAL  
tax DECIMAL  
total DECIMAL  
notes TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP

Statuses:

Requested  
Ready to Deliver  
Delivered  
Cancelled

Payment statuses:

Unpaid  
Partially Paid  
Paid  
11. order_items  
Field Type  
id BIGINT PK  
order_id BIGINT FK  
product_id BIGINT FK  
product_name_snapshot VARCHAR  
quantity DECIMAL  
unit_price DECIMAL  
discount DECIMAL  
subtotal DECIMAL  
cost_at_sale DECIMAL  
created_at TIMESTAMP  
updated_at TIMESTAMP

unit_price is the actual selling price at the time of the order, not necessarily the product default price.

Purchasing  
12. suppliers  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
supplier_code VARCHAR  
name VARCHAR  
phone VARCHAR  
email VARCHAR  
address TEXT  
notes TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
13. purchases  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
supplier_id BIGINT FK  
purchase_number VARCHAR  
purchase_date DATE  
payment_status VARCHAR  
subtotal DECIMAL  
discount DECIMAL  
tax DECIMAL  
total DECIMAL  
due_date DATE NULL  
notes TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
14. purchase_items  
Field Type  
id BIGINT PK  
purchase_id BIGINT FK  
product_id BIGINT FK  
product_name_snapshot VARCHAR  
quantity DECIMAL  
unit_cost DECIMAL  
discount DECIMAL  
subtotal DECIMAL  
created_at TIMESTAMP  
updated_at TIMESTAMP  
Payments  
15. payments

Generic incoming/outgoing payment.

Field Type  
id BIGINT PK  
business_id BIGINT FK  
payment_type VARCHAR  
party_type VARCHAR  
party_id BIGINT  
amount DECIMAL  
payment_date DATE  
payment_method VARCHAR  
reference_number VARCHAR  
notes TEXT  
created_by BIGINT FK  
created_at TIMESTAMP  
deleted_at TIMESTAMP

Examples:

payment_type:  
incoming  
outgoing

party_type:  
customer  
supplier  
16. payment_allocations

Allows one payment to be allocated to documents.

Field Type  
id BIGINT PK  
payment_id BIGINT FK  
document_type VARCHAR  
document_id BIGINT  
amount DECIMAL

Example:

Payment Rp1.000.000  
↓  
Rp600.000 → Order #001  
Rp400.000 → Order #002  
Delivery  
17. deliveries  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
order_id BIGINT FK  
delivery_number VARCHAR  
delivery_date DATE  
delivery_method VARCHAR  
recipient_name VARCHAR  
recipient_phone VARCHAR  
delivery_address TEXT  
transport_cost DECIMAL  
status VARCHAR  
notes TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
18. delivery_items  
Field Type  
id BIGINT PK  
delivery_id BIGINT FK  
order_item_id BIGINT FK  
quantity DECIMAL

Future-proof for partial delivery, although V1 workflow can require full delivery.

Invoice  
19. invoices  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
order_id BIGINT FK  
invoice_number VARCHAR  
invoice_date DATE  
status VARCHAR  
subtotal DECIMAL  
discount DECIMAL  
tax DECIMAL  
total DECIMAL  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
Replacement  
20. replacements  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
order_id BIGINT FK  
replacement_number VARCHAR  
reason TEXT  
status VARCHAR  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
21. replacement_items  
Field Type  
id BIGINT PK  
replacement_id BIGINT FK  
product_id BIGINT FK  
quantity DECIMAL  
Finance  
22. expense_categories  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
name VARCHAR  
status VARCHAR  
created_at TIMESTAMP  
updated_at TIMESTAMP

Examples:

Transport  
Fuel  
Packaging  
Telephone  
Marketing  
Office  
Other  
23. expenses  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
expense_category_id BIGINT FK  
expense_date DATE  
amount DECIMAL  
payment_account_id BIGINT FK  
description TEXT  
created_at TIMESTAMP  
updated_at TIMESTAMP  
deleted_at TIMESTAMP  
24. financial_accounts

Represents cash, bank, e-wallet, etc.

Field Type  
id BIGINT PK  
business_id BIGINT FK  
name VARCHAR  
type VARCHAR  
opening_balance DECIMAL  
current_balance DECIMAL  
status VARCHAR  
created_at TIMESTAMP  
updated_at TIMESTAMP

Examples:

Cash  
BCA  
Mandiri  
GoPay  
Accounting  
25. chart_of_accounts  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
account_code VARCHAR  
name VARCHAR  
account_type VARCHAR  
parent_id BIGINT NULL  
is_system BOOLEAN  
status VARCHAR

Account types:

Asset  
Liability  
Equity  
Revenue  
Expense  
26. journal_entries  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
entry_number VARCHAR  
entry_date DATE  
reference_type VARCHAR  
reference_id BIGINT  
description TEXT  
created_by BIGINT FK  
created_at TIMESTAMP  
27. journal_entry_lines  
Field Type  
id BIGINT PK  
journal_entry_id BIGINT FK  
account_id BIGINT FK  
debit DECIMAL  
credit DECIMAL  
description TEXT

Every journal entry must satisfy:

TOTAL DEBIT = TOTAL CREDIT  
Audit / History  
28. audit_logs  
Field Type  
id BIGINT PK  
business_id BIGINT FK  
user_id BIGINT FK  
record_id BIGINT  
record_type VARCHAR  
action VARCHAR  
page VARCHAR  
route VARCHAR  
before_data JSON  
after_data JSON  
created_at TIMESTAMP

History UI:

## Property Previous Value Current Value

Customer ABC Store XYZ Store  
Status Requested Delivered  
Total Rp500.000 Rp550.000

Audit logs must never be hard deleted.

ACCOUNT  
1 ─── N BUSINESS

BUSINESS  
1 ─── N PRODUCTS  
1 ─── N CUSTOMERS  
1 ─── N SUPPLIERS  
1 ─── N ORDERS  
1 ─── N PURCHASES  
1 ─── N PAYMENTS  
1 ─── N EXPENSES  
1 ─── N FINANCIAL_ACCOUNTS  
1 ─── N JOURNAL_ENTRIES  
1 ─── N AUDIT_LOGS

PRODUCT  
1 ─── N ORDER_ITEMS  
1 ─── N PURCHASE_ITEMS  
1 ─── N STOCK_MOVEMENTS  
1 ─── N REPLACEMENT_ITEMS

CUSTOMER  
1 ─── N ORDERS

SUPPLIER  
1 ─── N PURCHASES

ORDER  
1 ─── N ORDER_ITEMS  
1 ─── N DELIVERIES  
1 ─── N INVOICES  
1 ─── N REPLACEMENTS

PURCHASE  
1 ─── N PURCHASE_ITEMS

DELIVERY  
1 ─── N DELIVERY_ITEMS

REPLACEMENT  
1 ─── N REPLACEMENT_ITEMS

JOURNAL_ENTRY  
1 ─── N JOURNAL_ENTRY_LINES

CHART_OF_ACCOUNT  
1 ─── N JOURNAL_ENTRY_LINES  
C4. Important Data Principles  
Stock movement is the inventory history source of truth.  
products.current_stock and products.average_cost may be cached values for performance.  
Order Item stores transaction-time price and cost snapshots.  
Purchase Item stores transaction-time product information.  
Product deletion must use soft delete so historical transactions remain intact.  
Orders and purchases must not lose historical data when product/customer/supplier information changes.  
Negative stock is allowed when the feature is enabled.  
Financial reports are generated from journal entries, not manually entered totals.  
Every important create/edit/delete/payment action creates an audit log.  
Soft-deleted transactional records must be restorable where business rules allow.  
All business-owned records must contain business_id.  
IDs and unique codes must be scoped to the business where appropriate.

---

## Current implementation addendum — Unit tables (2026-10-21)

Added to the app schema (`lib/db/schema.ts`, migration `0009_unit_conversion`). Not part of the original archive above.

- `unit_rules`: id (text, `UNT-YYYYMM-####`), business_id, big_product_id → products, small_product_id → products, ratio (int > 0), status (active | inactive), note, date, created_at.
- `unit_operations`: id (text, `UOP-YYYYMM-####`), business_id, rule_id → unit_rules, type (split | combine), source_product_id, target_product_id, qty_out, qty_in, value_moved (numeric 14,2), note, date, created_at.
- `movement_type` enum gained value `unit`. Unit operations write two stock movements with reference `unit:{ruleId}:{opId}`.
- Stock is derived from `stock_movements`; products.average_cost is updated for the target product only.
