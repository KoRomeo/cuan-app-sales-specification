# Screen & Component Specifications

> Extracted page-level UI requirements from the recovered master specification.

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

---

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

---

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

---

32. Breadcrumb

Seperti yang kamu inginkan, tetapi dibuat lebih modern.

Orders / ORD-202610-0001

atau:

Orders / Toko ABC / Order #ORD-001

Jadi user selalu tahu posisinya.

---

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

---

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

---

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

---

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

---

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

---

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

---

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