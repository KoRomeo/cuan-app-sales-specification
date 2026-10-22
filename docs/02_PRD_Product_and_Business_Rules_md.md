# PRD — Product Definition & Business Rules

> Extracted from the recovered master specification. Treat as the original approved product concept; confirm any rule against the current app before implementation.

1. Product Definition

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

18. Tax

Tax optional.

Default:

Tax = —

Business dapat mengaktifkan tax melalui settings.

---

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

---

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

---

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

---

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

---

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

---

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