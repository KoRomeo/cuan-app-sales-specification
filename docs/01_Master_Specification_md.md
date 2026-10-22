CUANAPP SALES — MASTER SPECIFICATION v1

Product Definition

CuanApp adalah platform business management.

Versi pertama yang kita bangun:

CuanApp Sales — Business Management System untuk sales/distribution berbasis inventory.

Karakteristik bisnis:

Customer meminta barang  
↓  
Sales mencari supplier / harga  
↓  
Menentukan apakah transaksi menguntungkan  
↓  
Purchase / gunakan existing stock  
↓  
Order  
↓  
Delivery  
↓  
Invoice  
↓  
Payment  
↓  
Accounting  
↓  
Profit

Namun CuanApp tidak memaksa urutan tersebut.

Misalnya:

Purchase → Stock → Order

atau:

Order → Purchase → Stock → Delivery

keduanya valid.

2. Core Philosophy

Ini saya jadikan prinsip utama CuanApp:

CuanApp records and manages the business; it does not force the business to operate in one rigid workflow.

Karena itu:

Kondisi Boleh?  
Stock = 0 ✅  
Stock < 0 ✅  
Purchase sebelum Order ✅  
Purchase setelah Order ✅  
Payment = Rp0 ✅  
Partial payment ✅  
Payment berkali-kali ✅  
Due date kosong ✅  
Transport cost = Rp0 ✅  
Minimum stock = 0 ✅  
Selling price berbeda antar Order ✅  
Product belum punya stock ✅  
Order langsung menjadi negatif ✅

CuanApp kemudian memberikan informasi/warning, bukan memblokir transaksi.

3. Final Information Architecture

Saya revisi navigation menjadi:

CUANAPP  
│  
├── OVERVIEW  
│ └── Dashboard  
│  
├── SALES  
│ ├── Orders  
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
│ └── Profit & Loss  
│  
├── REPORTS  
│ ├── Sales Report  
│ ├── Purchase Report  
│ ├── Inventory Report  
│ └── Financial Reports  
│ ├── Balance Sheet  
│ ├── Cash Flow  
│ └── General Ledger  
│  
├── ACTIVITY  
│ └── History  
│  
└── SETTINGS  
├── Business  
├── Profile  
├── Features  
└── Preferences  
Yang saya tambahkan

Deliveries  
Karena delivery sekarang sudah menjadi bagian V1.

Stock Movements  
Karena stock tidak cukup hanya menunjukkan angka akhir.

Reports  
Supaya Finance tidak dipenuhi berbagai laporan.

4. Order  
    Status

Kita gunakan UX writing:

Requested  
Ready to Deliver  
Delivered  
Cancelled  
Requested

Pesanan sudah dibuat tetapi belum siap dikirim.

Contoh:

Stock = 0  
Order = 20

Status:  
Requested

Stock menjadi:

-20  
Ready to Deliver

Barang sudah tersedia dan order siap dikirim.

Delivered

Barang telah dikirim.

Cancelled

Order tidak dilanjutkan.

Contoh pengalaman lapangan kamu:

Customer:  
Bear Brand × 100  
Harga disepakati RpX

Supplier:  
Cost terlalu tinggi

Tidak profitable  
↓  
Cancel Order

Jika sebelumnya stock sudah berubah:

Stock movement di-reverse

sehingga stock kembali ke keadaan sebelum Order.

5. Payment Status

Dipisahkan dari Order Status.

Unpaid  
Partially Paid  
Paid

Contoh valid:

Order Status:  
Delivered

Payment Status:  
Unpaid

atau:

Order Status:  
Ready to Deliver

Payment Status:  
Paid  
6. Order Flow  
Existing stock  
Create Order  
↓  
Stock cukup  
↓  
Ready to Deliver  
↓  
Create Delivery  
↓  
Delivered  
Stock tidak cukup  
Create Order  
↓  
Stock kurang  
↓  
Requested  
↓  
Purchase  
↓  
Stock masuk  
↓  
Ready to Deliver  
↓  
Delivery  
↓  
Delivered  
Tidak profitable  
Requested  
↓  
Supplier price checked  
↓  
Not profitable  
↓  
Cancelled  
7. Product

Product master menyimpan default information, bukan harga transaksi final.

Minimal:

Product  
├── Product ID  
├── Product Name  
├── Selling Price  
├── Purchase Cost / Cost Reference  
├── Average Cost  
├── Stock  
├── Minimum Stock  
├── Created At  
├── Updated At  
└── Deleted At

Tidak ada:

Product image  
Category  
Description  
Unit

untuk CuanApp Sales V1.

Selling Price

Contoh:

Product:  
Bear Brand

Default Selling Price:  
Rp15.000

Order bisa mengubah:

Rp15.000 → Rp16.000

Jadi:

Product Price = default/reference price

sedangkan:

Order Item Price = actual transaction price

Ini penting.

8. Weighted Average Cost

Kita gunakan Moving Weighted Average Cost.

Contoh:

Stock:  
10 pcs × Rp10.000

Purchase:  
10 pcs × Rp12.000

Average:

(10 × 10.000 + 10 × 12.000)  
÷ 20

= Rp11.000

Maka:

Average Cost = Rp11.000

Ketika Order:

Selling Price = Rp15.000  
COGS = Rp11.000  
Profit/unit = Rp4.000  
Important: negative stock

Karena CuanApp membolehkan stock negatif, kita perlu aturan khusus.

Contoh:

Stock = -20  
Last Average Cost = Rp10.000

Order berikutnya/purchase masuk:

Purchase 30 × Rp12.000

20 unit pertama dianggap menutup negative stock menggunakan last known cost.

Sisa:

10 × Rp12.000

menjadi inventory positif dengan cost Rp12.000.

Jadi negative stock tidak boleh membuat Average Cost menjadi aneh/negatif.

Ini akan menjadi business rule khusus CuanApp.

9. Stock

Stock bukan sekadar:

Product → Stock = 50

Kita simpan seluruh movement:

Stock Movement

+100 Purchase  
-20 Order  
-1 Replacement  
-2 Adjustment

Sehingga:

# Current Stock

Opening Stock  
+  
all stock movements  
Movement types  
Purchase  
Sale / Order  
Replacement  
Stock Adjustment  
Return/Reversal  
Opening Balance  
10. Low Stock vs Negative Stock

Ini penting karena kamu menekankan fleksibilitas.

Minimum Stock = 0  
Stock = 0

→ normal.

Minimum Stock = 20  
Stock = 15

→ Low Stock warning.

Stock < 0  
Stock = -5

→ Negative Stock, lebih serius.

Dashboard dapat menampilkan:

Negative Stock  
5 products

User bisa klik → langsung menuju filtered Stock page.

11. Purchase

Purchase dapat terjadi kapan saja.

Minimal:

Purchase  
├── Purchase ID  
├── Date  
├── Supplier  
├── Items  
├── Total  
├── Payment  
├── Payment Status  
├── Due Date  
└── Notes

Purchase item:

Product  
Quantity  
Purchase Price  
Subtotal

Struktur ini meneruskan konsep Excel yang sudah kita buat, di mana Purchase mencatat product, quantity, purchase price, supplier, payment status, amount paid, dan remaining payment.

12. Supplier Payment

Payment dapat:

Rp0  
Rp500.000  
Rp500.000 + Rp200.000

hingga:

Outstanding = Rp0

Status:

Unpaid  
Partially Paid  
Paid

Due date:

Optional  
13. Customer Receivable

Customer juga sama.

Order  
↓  
Total Rp1.000.000

Payment:  
Rp300.000

Outstanding:  
Rp700.000

Kemudian:

Payment:  
Rp200.000

Outstanding:  
Rp500.000

Customer dapat memiliki beberapa outstanding Order.

CuanApp menyediakan:

Oldest outstanding first

sebagai default allocation.

Namun user tetap dapat mengubah allocation secara manual.

14. Delivery

Delivery menjadi entity tersendiri.

Order  
↓  
Delivery  
↓  
Delivery Document

Informasi:

Delivery ID  
Order ID  
Delivery Date  
Delivery Method  
Recipient  
Address  
Transport Cost  
Notes

Delivery method:

Own Delivery  
Expedition  
Customer Pickup

tetapi hanya yang diaktifkan oleh business configuration yang ditampilkan.

Transport:

Rp0

tetap valid.

15. Surat Jalan

Surat Jalan bukan sekadar tampilan Order.

Flow:

Order  
↓  
Delivery  
↓  
Generate Surat Jalan

Contoh:

SURAT JALAN

No: SJ-202610-0001

Customer  
Toko ABC

Delivery Date  
10/10/2026

Delivery Method  
Own Delivery

Items  
Product Qty  
Bear Brand 100

Tidak ada tracking number.

Replacement juga bisa memiliki Surat Jalan sendiri.

16. Returns / Replacement

Tidak perlu tipe return.

Konsepnya:

Return creates a replacement obligation.

Contoh:

Order:  
100 pcs

Customer reports:  
1 damaged

CuanApp:

Replacement Outstanding: 1

Kemudian:

Replacement Delivery  
Qty = 1

Stock:

Original delivery -100  
Replacement delivery -1  
Total impact -101

Barang rusak tidak otomatis masuk kembali sebagai usable stock.

17. Invoice

Invoice berasal dari Order.

Order  
↓  
Invoice  
↓  
Preview  
↓  
Print / PDF / Resend

Invoice Number:

Invoice No = Order ID

Konsep invoice Excel sebelumnya juga sudah menggunakan Order ID sebagai nomor invoice dan membagi dokumen menjadi 12 item per halaman, dengan halaman tambahan dibuat ke bawah.

Untuk aplikasi web kita tidak harus meniru layout Excel tersebut secara visual. Informasinya yang dipertahankan; desainnya dibuat ulang khusus CuanApp.

18. Tax

Tax optional.

Default:

Tax = —

Business dapat mengaktifkan tax melalui settings.

19. Expenses

Expense:

Expense ID  
Date  
Category  
Amount  
Payment Account  
Description

Kategori default:

Transport  
Fuel  
Packaging  
Telephone  
Marketing  
Office  
Other

User bisa:

- Add Category

seperti konsep custom category yang kamu inginkan.

20. Profit & Loss

Dasarnya:

Revenue

- COGS  
    = Gross Profit

Gross Profit

- Operating Expenses  
    = Net Profit

Transport cost dapat menjadi expense.

Contoh:

Revenue Rp10.000.000  
COGS Rp7.000.000  
────────────────────────────────────  
Gross Profit Rp3.000.000

Transport Rp300.000  
Other Expense Rp200.000  
────────────────────────────────────  
Net Profit Rp2.500.000  
21. Accounting Engine

UI sederhana, tetapi engine proper accounting.

Entity penting:

Chart of Accounts  
Journal Entries  
Journal Entry Lines  
Financial Accounts

Transaksi otomatis menghasilkan accounting entries.

Purchase  
Inventory Dr  
Payable/Cash Cr  
Sale  
Receivable/Cash Dr  
Revenue Cr

COGS Dr  
Inventory Cr  
Customer Payment  
Cash/Bank Dr  
Receivable Cr  
Expense  
Expense Dr  
Cash/Bank Cr

Dengan demikian:

P&L  
Balance Sheet  
Cash Flow  
General Ledger

dapat dihasilkan dari transaksi.

22. Dashboard

Dashboard CuanApp Sales tidak akan meniru screenshot Cetakku.

Struktur informasi yang saya rekomendasikan:

Dashboard

[ Period ▼ ]

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  
Revenue │ Gross Profit│ Net Profit │ Receivables │  
Rp... │ Rp... │ Rp... │ Rp...  
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Revenue & Profit Trend

Outstanding Receivables

Outstanding Payables

Negative / Low Stock

Top Products

Recent Orders

Period:

Today  
This Week  
This Month  
Last Month  
This Quarter  
This Year  
Custom  
All Time  
23. History / Audit Log

Ini saya anggap final.

Main table:

Record ID Date Time Page Action  
RECORD-0001 10/05/2026 19:34 Orders Edit Order  
RECORD-0002 10/05/2026 19:40 Purchases Create Purchase  
RECORD-0003 10/05/2026 19:45 Payables Add Payment

Detail:

RECORD-0001

Edit Order

Property Previous Value Current Value  
Customer Toko ABC Toko XYZ  
Status Requested Ready to Deliver  
Total Rp1.500.000 Rp1.750.000

Untuk Create:

Previous Value = —  
Current Value = value

Untuk Delete:

Previous Value = value  
Current Value = —

History tidak dapat dihapus oleh user biasa.

24. Delete

Semua transaksi penting menggunakan:

Soft Delete

Bukan hard delete.

deleted_at  
deleted_by

Delete:

Confirmation  
↓  
Soft Delete  
↓  
Reverse affected business state  
↓  
Create History  
↓  
Available for Restore

Jadi data tetap tersedia untuk audit.

25. Cross-page navigation

CuanApp akan terasa seperti satu interconnected system.

Contoh:

Order #ORD-001  
│  
├── Customer → Toko ABC  
│ ↓  
│ Customer Detail  
│  
├── Product → Panadol  
│ ↓  
│ Product Detail  
│  
├── Supplier → Supplier XYZ  
│ ↓  
│ Supplier Detail  
│  
├── Payment  
│ ↓  
│ Receivable  
│  
├── Delivery  
│ ↓  
│ Surat Jalan  
│  
└── Invoice

Context menu dapat memberikan:

View Customer  
View Order  
View Receivables  
View Supplier  
View Stock  
View History  
26. Page vs Modal  
Full page  
Dashboard  
Orders  
Order Detail  
Customers  
Customer Detail  
Invoices  
Deliveries  
Purchases  
Purchase Detail  
Suppliers  
Products  
Product Detail  
Stock  
Stock Movements  
Receivables  
Payables  
Expenses  
P&L  
Reports  
History  
History Detail  
Settings  
Modal  
Quick Add Customer  
Quick Add Supplier  
Quick Add Product  
Add Payment  
Stock Adjustment  
Add Expense  
Add Category  
Delete Confirmation  
Cancel Confirmation  
Restore Confirmation

Backdrop menggunakan opacity yang cukup untuk memisahkan modal dari halaman.

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