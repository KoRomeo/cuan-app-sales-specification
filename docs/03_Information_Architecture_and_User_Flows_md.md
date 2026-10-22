# Information Architecture & User Flows

> Extracted from the recovered master specification.

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
│ ├── Stock Movements
│ └── Units (split / combine)  
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

---

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

---

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

---

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
    │ ├── Stock Movements
    │ └── Units (split / combine)  
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