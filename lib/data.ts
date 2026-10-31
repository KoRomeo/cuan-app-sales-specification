export const TODAY = '2026-10-06'

export type OrderStatus = 'requested' | 'ready' | 'delivered' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type DeliveryMethod = 'own' | 'expedition' | 'pickup'
export type StockStatus = 'normal' | 'low' | 'negative'
export type MovementType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'replacement'
  | 'adjustment'
  | 'reversal'

export interface Product {
  id: string
  name: string
  sellingPrice: number
  costReference: number
  averageCost: number
  stock: number
  minimumStock: number
}

export interface Party {
  id: string
  name: string
  phone: string
  address: string
}

export interface Payment {
  id: string
  date: string
  amount: number
  account: string
}

export interface OrderItem {
  productId: string
  qty: number
  price: number
  discount: number
  discountType?: 'amount' | 'percent'
  unitCost: number
}

export interface Delivery {
  id: string
  date: string
  method: DeliveryMethod
  recipient: string
  driverName?: string
  address: string
  transportCost: number
}

export interface Order {
  id: string
  date: string
  customerId: string
  status: OrderStatus
  items: OrderItem[]
  payments: Payment[]
  delivery: Delivery | null
  dueDate: string | null
  notes: string
}

export interface PurchaseItem {
  productId: string
  qty: number
  price: number
  discount?: number
  discountType?: 'amount' | 'percent'
}

export interface Purchase {
  id: string
  date: string
  supplierId: string
  items: PurchaseItem[]
  payments: Payment[]
  dueDate: string | null
  notes: string
}

export interface Replacement {
  id: string
  date: string
  orderId: string
  productId: string
  qty: number
  reason: string
  delivered: boolean
}

export interface Expense {
  id: string
  date: string
  category: string
  amount: number
  account: string
  description: string
  deletedAt?: string | null
}

export interface StockMovement {
  id: string
  date: string
  productId: string
  type: MovementType
  qty: number
  reference: string
}

export interface HistoryRecord {
  id: string
  date: string
  time: string
  page: string
  action: string
  user: string
  reference: string
  changes: { property: string; previous: string; current: string }[]
}

const productSeed: Omit<Product, 'stock'>[] = [
  { id: 'P-0001', name: 'Bear Brand 189ml', sellingPrice: 15000, costReference: 11000, averageCost: 11000, minimumStock: 50 },
  { id: 'P-0002', name: 'Indomie Goreng (Dus)', sellingPrice: 118000, costReference: 102000, averageCost: 101500, minimumStock: 20 },
  { id: 'P-0003', name: 'Aqua 600ml (Dus)', sellingPrice: 52000, costReference: 44000, averageCost: 43500, minimumStock: 15 },
  { id: 'P-0004', name: 'Panadol Extra', sellingPrice: 13500, costReference: 10500, averageCost: 10200, minimumStock: 30 },
  { id: 'P-0005', name: 'Teh Botol Sosro (Dus)', sellingPrice: 78000, costReference: 66000, averageCost: 65800, minimumStock: 0 },
  { id: 'P-0006', name: 'Gula Pasir 1kg', sellingPrice: 17500, costReference: 15200, averageCost: 15100, minimumStock: 40 },
  { id: 'P-0007', name: 'Minyak Goreng Bimoli 2L', sellingPrice: 39000, costReference: 34500, averageCost: 34300, minimumStock: 10 },
  { id: 'P-0008', name: 'Beras Premium 5kg', sellingPrice: 78000, costReference: 69000, averageCost: 68500, minimumStock: 20 },
  { id: 'P-0009', name: 'Kopi Kapal Api 165g', sellingPrice: 14500, costReference: 12000, averageCost: 11900, minimumStock: 24 },
  { id: 'P-0010', name: 'Sabun Lifebuoy', sellingPrice: 4500, costReference: 3500, averageCost: 3450, minimumStock: 100 },
  { id: 'P-0011', name: 'Susu Ultra 1L', sellingPrice: 19500, costReference: 16500, averageCost: 16400, minimumStock: 24 },
  { id: 'P-0012', name: 'Pocari Sweat 500ml (Dus)', sellingPrice: 135000, costReference: 118000, averageCost: 117500, minimumStock: 10 },
]

const targetStock: Record<string, number> = {
  'P-0001': -20,
  'P-0002': 42,
  'P-0003': 8,
  'P-0004': 120,
  'P-0005': 0,
  'P-0006': 64,
  'P-0007': -6,
  'P-0008': 25,
  'P-0009': 12,
  'P-0010': 300,
  'P-0011': 36,
  'P-0012': 3,
}

export const customers: Party[] = [
  { id: 'C-0001', name: 'Toko ABC', phone: '0812-3456-7890', address: 'Jl. Merdeka No. 12, Bandung' },
  { id: 'C-0002', name: 'Toko XYZ', phone: '0813-2211-4455', address: 'Jl. Sudirman No. 88, Bandung' },
  { id: 'C-0003', name: 'Warung Bu Siti', phone: '0857-1122-3344', address: 'Jl. Cihampelas No. 5, Bandung' },
  { id: 'C-0004', name: 'Minimarket Sejahtera', phone: '0821-9988-7766', address: 'Jl. Dago No. 140, Bandung' },
  { id: 'C-0005', name: 'CV Maju Jaya', phone: '022-7203-1188', address: 'Jl. Soekarno-Hatta No. 301, Bandung' },
  { id: 'C-0006', name: 'Toko Berkah', phone: '0819-5544-3322', address: 'Jl. Kopo No. 77, Bandung' },
  { id: 'C-0007', name: 'Apotek Sehat', phone: '022-4231-9090', address: 'Jl. Riau No. 21, Bandung' },
  { id: 'C-0008', name: 'Koperasi Karyawan', phone: '022-6012-3030', address: 'Jl. Gatot Subroto No. 9, Cimahi' },
]

export const suppliers: Party[] = [
  { id: 'S-0001', name: 'PT Sumber Makmur', phone: '021-5566-7788', address: 'Kawasan Industri Pulogadung, Jakarta' },
  { id: 'S-0002', name: 'CV Distribusi Nusantara', phone: '022-8877-6655', address: 'Jl. Moh. Toha No. 200, Bandung' },
  { id: 'S-0003', name: 'PT Indo Grosir', phone: '021-4433-2211', address: 'Jl. Daan Mogot KM 11, Jakarta' },
  { id: 'S-0004', name: 'Agen Sentosa', phone: '0811-2020-3030', address: 'Pasar Caringin Blok C, Bandung' },
  { id: 'S-0005', name: 'PT Mega Pangan', phone: '021-7788-9900', address: 'Jl. Raya Bekasi KM 22, Bekasi' },
]

const cost = (productId: string) =>
  productSeed.find((p) => p.id === productId)?.averageCost ?? 0

const item = (productId: string, qty: number, price: number, discount = 0): OrderItem => ({
  productId,
  qty,
  price,
  discount,
  unitCost: cost(productId),
})

export const orders: Order[] = [
  {
    id: 'ORD-202610-0010', date: '2026-10-06', customerId: 'C-0001', status: 'requested',
    items: [item('P-0001', 100, 16000)], payments: [], delivery: null, dueDate: '2026-10-20',
    notes: 'Harga disepakati Rp16.000/pcs. Menunggu konfirmasi harga supplier.',
  },
  {
    id: 'ORD-202610-0009', date: '2026-10-05', customerId: 'C-0004', status: 'ready',
    items: [item('P-0002', 10, 120000), item('P-0006', 20, 17500)],
    payments: [{ id: 'PAY-0021', date: '2026-10-05', amount: 1550000, account: 'Bank BCA' }],
    delivery: null, dueDate: null, notes: '',
  },
  {
    id: 'ORD-202610-0008', date: '2026-10-05', customerId: 'C-0002', status: 'delivered',
    items: [item('P-0003', 12, 52000), item('P-0005', 5, 78000)],
    payments: [{ id: 'PAY-0020', date: '2026-10-05', amount: 500000, account: 'Cash' }],
    delivery: { id: 'SJ-202610-0006', date: '2026-10-05', method: 'own', recipient: 'Pak Hendra', address: 'Jl. Sudirman No. 88, Bandung', transportCost: 50000 },
    dueDate: '2026-10-19', notes: '1 dus Aqua dilaporkan rusak.',
  },
  {
    id: 'ORD-202610-0007', date: '2026-10-04', customerId: 'C-0007', status: 'delivered',
    items: [item('P-0004', 60, 13500)],
    payments: [{ id: 'PAY-0019', date: '2026-10-04', amount: 810000, account: 'Bank BCA' }],
    delivery: { id: 'SJ-202610-0005', date: '2026-10-04', method: 'expedition', recipient: 'Apt. Rina', address: 'Jl. Riau No. 21, Bandung', transportCost: 35000 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202610-0006', date: '2026-10-03', customerId: 'C-0005', status: 'requested',
    items: [item('P-0007', 30, 39500)], payments: [], delivery: null, dueDate: '2026-10-31', notes: '',
  },
  {
    id: 'ORD-202610-0005', date: '2026-10-03', customerId: 'C-0003', status: 'delivered',
    items: [item('P-0008', 4, 78000), item('P-0006', 5, 17500), item('P-0009', 6, 14500)],
    payments: [{ id: 'PAY-0018', date: '2026-10-03', amount: 486500, account: 'Cash' }],
    delivery: { id: 'SJ-202610-0004', date: '2026-10-03', method: 'pickup', recipient: 'Bu Siti', address: 'Diambil di gudang', transportCost: 0 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202610-0004', date: '2026-10-02', customerId: 'C-0006', status: 'cancelled',
    items: [item('P-0001', 100, 14000)], payments: [], delivery: null, dueDate: null,
    notes: 'Dibatalkan: harga supplier terlalu tinggi, transaksi tidak menguntungkan.',
  },
  {
    id: 'ORD-202610-0003', date: '2026-10-02', customerId: 'C-0008', status: 'ready',
    items: [item('P-0011', 24, 19500), item('P-0010', 100, 4500)],
    payments: [{ id: 'PAY-0017', date: '2026-10-02', amount: 300000, account: 'Bank BCA' }],
    delivery: null, dueDate: '2026-10-16', notes: '',
  },
  {
    id: 'ORD-202610-0002', date: '2026-10-01', customerId: 'C-0001', status: 'delivered',
    items: [item('P-0002', 15, 118000), item('P-0012', 5, 135000)],
    payments: [{ id: 'PAY-0016', date: '2026-10-02', amount: 1000000, account: 'Bank BCA' }],
    delivery: { id: 'SJ-202610-0002', date: '2026-10-01', method: 'own', recipient: 'Pak Budi', address: 'Jl. Merdeka No. 12, Bandung', transportCost: 75000 },
    dueDate: '2026-10-15', notes: '',
  },
  {
    id: 'ORD-202610-0001', date: '2026-10-01', customerId: 'C-0004', status: 'delivered',
    items: [item('P-0005', 10, 78000)],
    payments: [{ id: 'PAY-0015', date: '2026-10-01', amount: 780000, account: 'Cash' }],
    delivery: { id: 'SJ-202610-0001', date: '2026-10-01', method: 'own', recipient: 'Ibu Wati', address: 'Jl. Dago No. 140, Bandung', transportCost: 40000 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202609-0006', date: '2026-09-28', customerId: 'C-0002', status: 'delivered',
    items: [item('P-0001', 80, 15500)],
    payments: [{ id: 'PAY-0014', date: '2026-09-30', amount: 1240000, account: 'Bank BCA' }],
    delivery: { id: 'SJ-202609-0006', date: '2026-09-28', method: 'own', recipient: 'Pak Hendra', address: 'Jl. Sudirman No. 88, Bandung', transportCost: 50000 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202609-0005', date: '2026-09-24', customerId: 'C-0005', status: 'delivered',
    items: [item('P-0008', 20, 77000), item('P-0007', 20, 39000)],
    payments: [
      { id: 'PAY-0011', date: '2026-09-24', amount: 700000, account: 'Bank BCA' },
      { id: 'PAY-0013', date: '2026-09-30', amount: 500000, account: 'Bank BCA' },
    ],
    delivery: { id: 'SJ-202609-0005', date: '2026-09-24', method: 'expedition', recipient: 'Gudang CV Maju Jaya', address: 'Jl. Soekarno-Hatta No. 301, Bandung', transportCost: 120000 },
    dueDate: '2026-10-08', notes: '',
  },
  {
    id: 'ORD-202609-0004', date: '2026-09-18', customerId: 'C-0007', status: 'delivered',
    items: [item('P-0004', 100, 13000)],
    payments: [{ id: 'PAY-0010', date: '2026-09-18', amount: 1300000, account: 'Bank BCA' }],
    delivery: { id: 'SJ-202609-0004', date: '2026-09-18', method: 'expedition', recipient: 'Apt. Rina', address: 'Jl. Riau No. 21, Bandung', transportCost: 35000 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202609-0003', date: '2026-09-12', customerId: 'C-0003', status: 'delivered',
    items: [item('P-0010', 200, 4500)], payments: [],
    delivery: { id: 'SJ-202609-0003', date: '2026-09-12', method: 'own', recipient: 'Bu Siti', address: 'Jl. Cihampelas No. 5, Bandung', transportCost: 25000 },
    dueDate: '2026-09-26', notes: '',
  },
  {
    id: 'ORD-202609-0002', date: '2026-09-08', customerId: 'C-0006', status: 'delivered',
    items: [item('P-0003', 20, 51000)],
    payments: [{ id: 'PAY-0008', date: '2026-09-08', amount: 1020000, account: 'Cash' }],
    delivery: { id: 'SJ-202609-0002', date: '2026-09-08', method: 'pickup', recipient: 'Pak Rahmat', address: 'Diambil di gudang', transportCost: 0 },
    dueDate: null, notes: '',
  },
  {
    id: 'ORD-202609-0001', date: '2026-09-03', customerId: 'C-0008', status: 'delivered',
    items: [item('P-0011', 48, 19000), item('P-0009', 24, 14000)],
    payments: [{ id: 'PAY-0006', date: '2026-09-04', amount: 1248000, account: 'Bank BCA' }],
    delivery: { id: 'SJ-202609-0001', date: '2026-09-03', method: 'own', recipient: 'Pengurus Koperasi', address: 'Jl. Gatot Subroto No. 9, Cimahi', transportCost: 60000 },
    dueDate: null, notes: '',
  },
]

export const purchases: Purchase[] = [
  {
    id: 'PUR-202610-0004', date: '2026-10-05', supplierId: 'S-0001',
    items: [{ productId: 'P-0002', qty: 30, price: 102000 }, { productId: 'P-0006', qty: 50, price: 15200 }],
    payments: [{ id: 'PAY-S-0012', date: '2026-10-05', amount: 2000000, account: 'Bank BCA' }],
    dueDate: '2026-10-20', notes: '',
  },
  {
    id: 'PUR-202610-0003', date: '2026-10-03', supplierId: 'S-0003',
    items: [{ productId: 'P-0004', qty: 150, price: 10500 }],
    payments: [{ id: 'PAY-S-0011', date: '2026-10-03', amount: 1575000, account: 'Bank BCA' }],
    dueDate: null, notes: '',
  },
  {
    id: 'PUR-202610-0002', date: '2026-10-02', supplierId: 'S-0002',
    items: [{ productId: 'P-0003', qty: 30, price: 44000 }, { productId: 'P-0005', qty: 15, price: 66000 }],
    payments: [], dueDate: '2026-10-16', notes: 'Tempo 14 hari.',
  },
  {
    id: 'PUR-202610-0001', date: '2026-10-01', supplierId: 'S-0005',
    items: [{ productId: 'P-0008', qty: 30, price: 69000 }],
    payments: [{ id: 'PAY-S-0010', date: '2026-10-01', amount: 1000000, account: 'Cash' }],
    dueDate: '2026-10-15', notes: '',
  },
  {
    id: 'PUR-202609-0003', date: '2026-09-25', supplierId: 'S-0004',
    items: [{ productId: 'P-0001', qty: 100, price: 11000 }],
    payments: [{ id: 'PAY-S-0008', date: '2026-09-25', amount: 1100000, account: 'Cash' }],
    dueDate: null, notes: '',
  },
  {
    id: 'PUR-202609-0002', date: '2026-09-15', supplierId: 'S-0001',
    items: [{ productId: 'P-0010', qty: 400, price: 3500 }, { productId: 'P-0011', qty: 80, price: 16500 }],
    payments: [{ id: 'PAY-S-0006', date: '2026-09-15', amount: 2720000, account: 'Bank BCA' }],
    dueDate: null, notes: '',
  },
  {
    id: 'PUR-202609-0001', date: '2026-09-05', supplierId: 'S-0002',
    items: [{ productId: 'P-0009', qty: 60, price: 12000 }, { productId: 'P-0012', qty: 15, price: 118000 }],
    payments: [{ id: 'PAY-S-0004', date: '2026-09-05', amount: 1500000, account: 'Bank BCA' }],
    dueDate: '2026-09-30', notes: '',
  },
]

export const replacements: Replacement[] = [
  { id: 'RPL-202610-0001', date: '2026-10-06', orderId: 'ORD-202610-0008', productId: 'P-0003', qty: 1, reason: 'Kemasan rusak saat diterima', delivered: false },
  { id: 'RPL-202610-0002', date: '2026-10-01', orderId: 'ORD-202609-0006', productId: 'P-0001', qty: 2, reason: 'Kaleng penyok', delivered: true },
  { id: 'RPL-202609-0001', date: '2026-09-26', orderId: 'ORD-202609-0005', productId: 'P-0007', qty: 1, reason: 'Botol bocor', delivered: true },
]

export const expenseCategories = ['Transport', 'Fuel', 'Packaging', 'Telephone', 'Marketing', 'Office', 'Other']

export const expenses: Expense[] = [
  { id: 'EXP-0012', date: '2026-10-05', category: 'Fuel', amount: 250000, account: 'Cash', description: 'Bensin mobil box' },
  { id: 'EXP-0011', date: '2026-10-04', category: 'Packaging', amount: 120000, account: 'Cash', description: 'Lakban & plastik wrap' },
  { id: 'EXP-0010', date: '2026-10-03', category: 'Telephone', amount: 150000, account: 'Bank BCA', description: 'Paket data & pulsa sales' },
  { id: 'EXP-0009', date: '2026-10-02', category: 'Marketing', amount: 300000, account: 'Bank BCA', description: 'Cetak brosur harga' },
  { id: 'EXP-0008', date: '2026-10-01', category: 'Office', amount: 450000, account: 'Bank BCA', description: 'Sewa gudang (porsi bulanan)' },
  { id: 'EXP-0007', date: '2026-09-28', category: 'Fuel', amount: 300000, account: 'Cash', description: 'Bensin mobil box' },
  { id: 'EXP-0006', date: '2026-09-22', category: 'Other', amount: 100000, account: 'Cash', description: 'Konsumsi kuli angkut' },
  { id: 'EXP-0005', date: '2026-09-18', category: 'Packaging', amount: 90000, account: 'Cash', description: 'Kardus bekas' },
  { id: 'EXP-0004', date: '2026-09-15', category: 'Telephone', amount: 150000, account: 'Bank BCA', description: 'Paket data & pulsa sales' },
  { id: 'EXP-0003', date: '2026-09-10', category: 'Transport', amount: 80000, account: 'Cash', description: 'Parkir & tol' },
  { id: 'EXP-0002', date: '2026-09-05', category: 'Fuel', amount: 280000, account: 'Cash', description: 'Bensin mobil box' },
  { id: 'EXP-0001', date: '2026-09-01', category: 'Office', amount: 450000, account: 'Bank BCA', description: 'Sewa gudang (porsi bulanan)' },
]

function buildMovements(): StockMovement[] {
  const list: Omit<StockMovement, 'id'>[] = []
  for (const p of purchases) {
    for (const it of p.items) {
      list.push({ date: p.date, productId: it.productId, type: 'purchase', qty: it.qty, reference: p.id })
    }
  }
  for (const o of orders) {
    for (const it of o.items) {
      list.push({ date: o.date, productId: it.productId, type: 'sale', qty: -it.qty, reference: o.id })
      if (o.status === 'cancelled') {
        list.push({ date: o.date, productId: it.productId, type: 'reversal', qty: it.qty, reference: o.id })
      }
    }
  }
  for (const r of replacements.filter((r) => r.delivered)) {
    list.push({ date: r.date, productId: r.productId, type: 'replacement', qty: -r.qty, reference: r.id })
  }
  list.push({ date: '2026-09-20', productId: 'P-0010', type: 'adjustment', qty: -2, reference: 'ADJ-0001' })
  list.push({ date: '2026-10-04', productId: 'P-0006', type: 'adjustment', qty: -1, reference: 'ADJ-0002' })

  for (const p of productSeed) {
    const net = list.filter((m) => m.productId === p.id).reduce((s, m) => s + m.qty, 0)
    list.push({ date: '2026-09-01', productId: p.id, type: 'opening', qty: targetStock[p.id] - net, reference: 'OPENING' })
  }

  return list
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .map((m, i, arr) => ({ ...m, id: `MOV-${String(arr.length - i).padStart(4, '0')}` }))
}

export const stockMovements: StockMovement[] = buildMovements()

export const products: Product[] = productSeed.map((p) => ({
  ...p,
  stock: stockMovements.filter((m) => m.productId === p.id).reduce((s, m) => s + m.qty, 0),
}))

export const history: HistoryRecord[] = [
  {
    id: 'RECORD-0014', date: '2026-10-06', time: '09:12', page: 'Orders', action: 'Create Order', user: 'Shane', reference: 'ORD-202610-0010',
    changes: [
      { property: 'Customer', previous: '—', current: 'Toko ABC' },
      { property: 'Status', previous: '—', current: 'Requested' },
      { property: 'Bear Brand 189ml', previous: '—', current: '100 × Rp16.000' },
      { property: 'Total', previous: '—', current: 'Rp1.600.000' },
    ],
  },
  {
    id: 'RECORD-0013', date: '2026-10-06', time: '08:47', page: 'Returns', action: 'Create Replacement', user: 'Shane', reference: 'RPL-202610-0001',
    changes: [
      { property: 'Order', previous: '—', current: 'ORD-202610-0008' },
      { property: 'Product', previous: '—', current: 'Aqua 600ml (Dus)' },
      { property: 'Replacement Outstanding', previous: '0', current: '1' },
    ],
  },
  {
    id: 'RECORD-0012', date: '2026-10-05', time: '19:40', page: 'Purchases', action: 'Create Purchase', user: 'Shane', reference: 'PUR-202610-0004',
    changes: [
      { property: 'Supplier', previous: '—', current: 'PT Sumber Makmur' },
      { property: 'Total', previous: '—', current: 'Rp3.820.000' },
      { property: 'Paid', previous: '—', current: 'Rp2.000.000' },
    ],
  },
  {
    id: 'RECORD-0011', date: '2026-10-05', time: '19:34', page: 'Orders', action: 'Edit Order', user: 'Shane', reference: 'ORD-202610-0009',
    changes: [
      { property: 'Status', previous: 'Requested', current: 'Ready to Deliver' },
      { property: 'Indomie Goreng (Dus) Price', previous: 'Rp118.000', current: 'Rp120.000' },
      { property: 'Total', previous: 'Rp1.530.000', current: 'Rp1.550.000' },
    ],
  },
  {
    id: 'RECORD-0010', date: '2026-10-05', time: '16:02', page: 'Deliveries', action: 'Create Delivery', user: 'Andi', reference: 'SJ-202610-0006',
    changes: [
      { property: 'Order', previous: '—', current: 'ORD-202610-0008' },
      { property: 'Method', previous: '—', current: 'Own Delivery' },
      { property: 'Transport Cost', previous: '—', current: 'Rp50.000' },
    ],
  },
  {
    id: 'RECORD-0009', date: '2026-10-05', time: '15:20', page: 'Receivables', action: 'Add Payment', user: 'Shane', reference: 'PAY-0020',
    changes: [
      { property: 'Order', previous: '—', current: 'ORD-202610-0008' },
      { property: 'Amount', previous: '—', current: 'Rp500.000' },
      { property: 'Outstanding', previous: 'Rp1.014.000', current: 'Rp514.000' },
    ],
  },
  {
    id: 'RECORD-0008', date: '2026-10-04', time: '10:15', page: 'Stock', action: 'Stock Adjustment', user: 'Andi', reference: 'ADJ-0002',
    changes: [
      { property: 'Product', previous: '—', current: 'Gula Pasir 1kg' },
      { property: 'Stock', previous: '65', current: '64' },
      { property: 'Reason', previous: '—', current: 'Kemasan sobek' },
    ],
  },
  {
    id: 'RECORD-0007', date: '2026-10-02', time: '14:05', page: 'Orders', action: 'Cancel Order', user: 'Shane', reference: 'ORD-202610-0004',
    changes: [
      { property: 'Status', previous: 'Requested', current: 'Cancelled' },
      { property: 'Bear Brand 189ml Stock', previous: '-100', current: '0 (reversed)' },
    ],
  },
  {
    id: 'RECORD-0006', date: '2026-10-02', time: '11:30', page: 'Payables', action: 'Add Payment', user: 'Shane', reference: 'PAY-S-0012',
    changes: [
      { property: 'Purchase', previous: '—', current: 'PUR-202610-0004' },
      { property: 'Amount', previous: '—', current: 'Rp2.000.000' },
    ],
  },
  {
    id: 'RECORD-0005', date: '2026-10-01', time: '08:00', page: 'Expenses', action: 'Create Expense', user: 'Shane', reference: 'EXP-0008',
    changes: [
      { property: 'Category', previous: '—', current: 'Office' },
      { property: 'Amount', previous: '—', current: 'Rp450.000' },
    ],
  },
  {
    id: 'RECORD-0004', date: '2026-09-30', time: '17:45', page: 'Customers', action: 'Edit Customer', user: 'Shane', reference: 'C-0002',
    changes: [{ property: 'Phone', previous: '0813-2211-4400', current: '0813-2211-4455' }],
  },
  {
    id: 'RECORD-0003', date: '2026-09-28', time: '13:10', page: 'Products', action: 'Edit Product', user: 'Shane', reference: 'P-0001',
    changes: [{ property: 'Selling Price', previous: 'Rp14.500', current: 'Rp15.000' }],
  },
  {
    id: 'RECORD-0002', date: '2026-09-20', time: '09:00', page: 'Products', action: 'Delete Product', user: 'Shane', reference: 'P-0013',
    changes: [
      { property: 'Product', previous: 'Biskuit Roma (Dus)', current: '—' },
      { property: 'Deleted At', previous: '—', current: '20/09/2026 09:00' },
    ],
  },
  {
    id: 'RECORD-0001', date: '2026-09-01', time: '08:00', page: 'Settings', action: 'Create Business', user: 'Shane', reference: 'BUS-0001',
    changes: [
      { property: 'Business Name', previous: '—', current: 'CV Cuan Sejahtera' },
      { property: 'Currency', previous: '—', current: 'IDR' },
      { property: 'Costing Method', previous: '—', current: 'Moving Weighted Average' },
    ],
  },
]

export const monthlyTrend = [
  { month: '2026-05', revenue: 9800000, grossProfit: 1650000, netProfit: 820000 },
  { month: '2026-06', revenue: 11200000, grossProfit: 1910000, netProfit: 1040000 },
  { month: '2026-07', revenue: 10450000, grossProfit: 1780000, netProfit: 930000 },
  { month: '2026-08', revenue: 12900000, grossProfit: 2240000, netProfit: 1290000 },
]

export const productById = (id: string) => products.find((p) => p.id === id)
export const customerById = (id: string) => customers.find((c) => c.id === id)
export const supplierById = (id: string) => suppliers.find((s) => s.id === id)
export const orderById = (id: string) => orders.find((o) => o.id === id)
export const purchaseById = (id: string) => purchases.find((p) => p.id === id)

export const discountAmount = (base: number, discount: number, type: 'amount' | 'percent' = 'amount') =>
  type === 'percent' ? base * Math.min(Math.max(discount, 0), 100) / 100 : Math.min(Math.max(discount, 0), base)

export const lineSubtotal = (it: { qty: number; price: number; discount?: number; discountType?: 'amount' | 'percent' }) => {
  const gross = it.qty * it.price
  return Math.max(0, gross - discountAmount(gross, it.discount ?? 0, it.discountType ?? 'amount'))
}

export const orderTotal = (o: Order) => o.items.reduce((s, it) => s + lineSubtotal(it), 0)
export const orderCogs = (o: Order) => o.items.reduce((s, it) => s + it.qty * it.unitCost, 0)
export const orderPaid = (o: Order) => o.payments.reduce((s, p) => s + p.amount, 0)
export const orderOutstanding = (o: Order) =>
  o.status === 'cancelled' ? 0 : Math.max(orderTotal(o) - orderPaid(o), 0)

export const purchaseTotal = (p: Purchase) => p.items.reduce((sum, item) => {
  const gross = item.qty * item.price
  const discount = item.discountType === 'percent' ? gross * Number(item.discount ?? 0) / 100 : Number(item.discount ?? 0)
  return sum + Math.ceil(Math.max(0, gross - discount) - 1e-9)
}, 0)
export const purchasePaid = (p: Purchase) => p.payments.reduce((s, x) => s + x.amount, 0)
export const purchaseOutstanding = (p: Purchase) => Math.max(purchaseTotal(p) - purchasePaid(p), 0)

export function paymentStatusOf(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'unpaid'
  if (paid >= total) return 'paid'
  return 'partial'
}

export const orderPaymentStatus = (o: Order) => paymentStatusOf(orderTotal(o), orderPaid(o))
export const purchasePaymentStatus = (p: Purchase) =>
  paymentStatusOf(purchaseTotal(p), purchasePaid(p))

export function stockStatusOf(p: Product): StockStatus {
  if (p.stock < 0) return 'negative'
  if (p.minimumStock > 0 && p.stock < p.minimumStock) return 'low'
  return 'normal'
}

export const isOverdue = (dueDate: string | null, outstanding: number) =>
  !!dueDate && outstanding > 0 && dueDate < TODAY

export const activeOrders = () => orders.filter((o) => o.status !== 'cancelled')

export type Period =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'allTime'

export function periodRange(period: Period): [string, string] {
  switch (period) {
    case 'today':
      return [TODAY, TODAY]
    case 'thisWeek':
      return ['2026-10-05', TODAY]
    case 'thisMonth':
      return ['2026-10-01', TODAY]
    case 'lastMonth':
      return ['2026-09-01', '2026-09-30']
    case 'thisQuarter':
      return ['2026-10-01', TODAY]
    case 'thisYear':
      return ['2026-01-01', TODAY]
    default:
      return ['0000-01-01', '9999-12-31']
  }
}

export const inRange = (date: string, [from, to]: [string, string]) => date >= from && date <= to
