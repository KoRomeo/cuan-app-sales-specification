import type { FeatureKey } from '@/components/providers'
import {
  adjustmentJournal,
  cashAccountNames,
  customerPaymentJournal,
  expenseJournal,
  postJournal,
  purchaseJournal,
  reverseJournals,
  saleJournals,
  supplierPaymentJournal,
  transportJournal,
} from '@/lib/accounting'
import {
  customerById,
  type DeliveryMethod,
  type Expense,
  expenseCategories,
  expenses,
  history,
  type HistoryRecord,
  type MovementType,
  type Order,
  orderById,
  type OrderItem,
  orderOutstanding,
  orderPaid,
  orderPaymentStatus,
  orders,
  orderTotal,
  type Payment,
  productById,
  purchaseById,
  purchaseOutstanding,
  purchasePaid,
  purchasePaymentStatus,
  purchases,
  purchaseTotal,
  stockMovements,
  supplierById,
  TODAY,
} from '@/lib/data'
import { formatIDR } from '@/lib/format'
import { DomainError, transaction } from '@/lib/store'

export type Features = Record<FeatureKey, boolean>

const CURRENT_USER = 'Shane'

/* ---------------------------- helpers ---------------------------- */

const isMoney = (n: number) => Number.isInteger(n) && n >= 0
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

function nextSeq(ids: string[], prefix: string, pad = 4) {
  const max = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((m, n) => Math.max(m, n), 0)
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

const monthPrefix = (kind: string, date: string) => `${kind}-${date.slice(0, 7).replace('-', '')}-`

const allCustomerPayments = () => orders.flatMap((o) => o.payments.map((p) => p.id))
const allSupplierPayments = () => purchases.flatMap((p) => p.payments.map((x) => x.id))

function assertAccount(account: string) {
  if (!cashAccountNames.includes(account)) throw new DomainError('err.invalidAccount')
}

type Change = HistoryRecord['changes'][number]

/** Audit log. Records are frozen on write — the log is append-only. */
function audit(page: string, action: string, reference: string, changes: Change[]) {
  const now = new Date()
  const record: HistoryRecord = Object.freeze({
    id: nextSeq(history.map((h) => h.id), 'RECORD-'),
    date: TODAY,
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    page,
    action,
    user: CURRENT_USER,
    reference,
    changes: Object.freeze(changes.map((c) => Object.freeze({ ...c }))) as Change[],
  })
  history.unshift(record)
}

const created = (property: string, current: string | number): Change => ({ property, previous: '—', current: String(current) })
const changed = (property: string, previous: string | number, current: string | number): Change => ({
  property,
  previous: String(previous),
  current: String(current),
})

/** Every stock change goes through here so it always leaves a stock movement. */
function moveStock(productId: string, qty: number, type: MovementType, reference: string, date: string): Change {
  const product = productById(productId)
  if (!product) throw new DomainError('err.unknownProduct')
  const before = product.stock
  product.stock += qty
  stockMovements.unshift({
    id: nextSeq(stockMovements.map((m) => m.id), 'MOV-'),
    date,
    productId,
    type,
    qty,
    reference,
  })
  return changed(`${product.name} Stock`, before, product.stock)
}

/* ----------------------------- orders ----------------------------- */

export interface NewOrderInput {
  customerId: string
  date: string
  items: { productId: string; qty: number; price: number; discount: number }[]
  paid: number
  account: string
  dueDate: string | null
  notes: string
}

/** Returns the stock each product would have after the given lines, aggregated per product. */
export function projectedStock(items: { productId: string; qty: number }[]) {
  const demand = new Map<string, number>()
  for (const it of items) demand.set(it.productId, (demand.get(it.productId) ?? 0) + it.qty)
  return [...demand].map(([productId, qty]) => {
    const p = productById(productId)
    return { productId, name: p?.name ?? productId, stock: p?.stock ?? 0, after: (p?.stock ?? 0) - qty }
  })
}

export function createOrder(input: NewOrderInput, features: Features) {
  return transaction(() => {
    const customer = customerById(input.customerId)
    if (!customer) throw new DomainError('err.unknownCustomer')
    if (!isDate(input.date)) throw new DomainError('err.invalidDate')
    if (input.items.length === 0) throw new DomainError('err.noItems')

    const items: OrderItem[] = input.items.map((it) => {
      const product = productById(it.productId)
      if (!product) throw new DomainError('err.unknownProduct')
      if (!isPositiveInt(it.qty)) throw new DomainError('err.invalidQty')
      if (!isMoney(it.price) || !isMoney(it.discount) || it.discount > it.qty * it.price) throw new DomainError('err.invalidAmount')
      // Snapshot price and cost at the time of sale; later product edits never touch this order.
      return { productId: it.productId, qty: it.qty, price: it.price, discount: it.discount, unitCost: product.averageCost }
    })

    const projection = projectedStock(items)
    if (features.inventory && !features.negativeStock) {
      const short = projection.find((p) => p.after < 0)
      if (short) throw new DomainError('err.insufficientStock', { product: short.name, stock: short.stock })
    }

    const total = items.reduce((s, it) => s + it.qty * it.price - it.discount, 0)
    if (!isMoney(input.paid) || input.paid > total) throw new DomainError('err.paymentExceeds')
    if (!features.customerCredit && input.paid !== total) throw new DomainError('err.customerCreditDisabled')
    if (input.paid > 0) assertAccount(input.account)

    const order: Order = {
      id: nextSeq(orders.map((o) => o.id), monthPrefix('ORD', input.date)),
      date: input.date,
      customerId: customer.id,
      status: 'requested',
      items,
      payments: [],
      delivery: null,
      dueDate: features.customerCredit && input.dueDate ? input.dueDate : null,
      notes: input.notes.trim(),
    }
    orders.unshift(order)

    const stockChanges = items.map((it) => moveStock(it.productId, -it.qty, 'sale', order.id, order.date))
    for (const j of saleJournals(order)) postJournal(j)

    if (input.paid > 0) recordCustomerPayment(order, { date: input.date, account: input.account, amount: input.paid }, false)

    audit('Orders', 'Create Order', order.id, [
      created('Customer', customer.name),
      created('Status', 'Requested'),
      ...items.map((it) => created(productById(it.productId)?.name ?? it.productId, `${it.qty} × ${formatIDR(it.price)}`)),
      created('Total', formatIDR(total)),
      created('Paid', formatIDR(input.paid)),
      ...stockChanges,
    ])

    return { order, negative: projection.filter((p) => p.after < 0) }
  })
}

interface PaymentInput {
  date: string
  account: string
  amount: number
}

function recordCustomerPayment(order: Order, input: PaymentInput, log = true) {
  if (order.status === 'cancelled') throw new DomainError('err.orderCancelled')
  if (!isDate(input.date)) throw new DomainError('err.invalidDate')
  if (!isPositiveInt(input.amount)) throw new DomainError('err.invalidAmount')
  if (input.amount > orderOutstanding(order)) throw new DomainError('err.paymentExceeds')
  assertAccount(input.account)

  const beforePaid = orderPaid(order)
  const beforeStatus = orderPaymentStatus(order)
  const payment: Payment = { id: nextSeq(allCustomerPayments(), 'PAY-'), date: input.date, amount: input.amount, account: input.account }
  order.payments.push(payment)
  postJournal(customerPaymentJournal(order, payment))

  if (log) {
    audit('Orders', 'Record Payment', order.id, [
      created('Payment', `${payment.id} · ${payment.account}`),
      changed('Paid', formatIDR(beforePaid), formatIDR(orderPaid(order))),
      changed('Payment Status', beforeStatus, orderPaymentStatus(order)),
    ])
  }
  return payment
}

export function addOrderPayment(orderId: string, input: PaymentInput) {
  return transaction(() => {
    const order = orderById(orderId)
    if (!order) throw new DomainError('err.notFound')
    return recordCustomerPayment(order, input)
  })
}

/** Receivables: allocates one customer payment to their oldest open orders first. */
export function receiveCustomerPayment(customerId: string, input: PaymentInput) {
  return transaction(() => {
    if (!isPositiveInt(input.amount)) throw new DomainError('err.invalidAmount')
    const open = orders
      .filter((o) => o.customerId === customerId && orderOutstanding(o) > 0)
      .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1))
    const owed = open.reduce((s, o) => s + orderOutstanding(o), 0)
    if (input.amount > owed) throw new DomainError('err.paymentExceeds')
    let left = input.amount
    const allocations = []
    for (const o of open) {
      if (left === 0) break
      const amount = Math.min(left, orderOutstanding(o))
      allocations.push(recordCustomerPayment(o, { ...input, amount }))
      left -= amount
    }
    return allocations
  })
}

export function cancelOrder(orderId: string) {
  return transaction(() => {
    const order = orderById(orderId)
    if (!order) throw new DomainError('err.notFound')
    if (order.status === 'cancelled') throw new DomainError('err.orderCancelled')
    if (order.status === 'delivered') throw new DomainError('err.cancelDelivered')
    if (order.payments.length > 0) throw new DomainError('err.cancelHasPayments')

    const before = order.status
    order.status = 'cancelled'
    const stockChanges = order.items.map((it) => moveStock(it.productId, it.qty, 'reversal', order.id, TODAY))
    reverseJournals(order.id, ['sale', 'cogs'], TODAY, `order ${order.id} cancelled`)

    audit('Orders', 'Cancel Order', order.id, [changed('Status', before, 'cancelled'), ...stockChanges])
  })
}

export interface DeliveryInput {
  date: string
  method: DeliveryMethod
  recipient: string
  address: string
  transportCost: number
}

export function createDelivery(orderId: string, input: DeliveryInput, features: Features) {
  return transaction(() => {
    const order = orderById(orderId)
    if (!order) throw new DomainError('err.notFound')
    if (order.status === 'cancelled') throw new DomainError('err.orderCancelled')
    if (order.delivery) throw new DomainError('err.alreadyDelivered')
    if ((input.method === 'own' && !features.ownDelivery) || (input.method === 'expedition' && !features.expedition)) {
      throw new DomainError('err.featureDisabled')
    }
    if (!isDate(input.date)) throw new DomainError('err.invalidDate')
    if (!isMoney(input.transportCost)) throw new DomainError('err.invalidAmount')

    const before = order.status
    order.delivery = {
      id: nextSeq(orders.flatMap((o) => (o.delivery ? [o.delivery.id] : [])), monthPrefix('SJ', input.date)),
      date: input.date,
      method: input.method,
      recipient: input.recipient.trim(),
      address: input.address.trim(),
      transportCost: input.transportCost,
    }
    order.status = 'delivered'
    const journal = transportJournal(order)
    if (journal) postJournal(journal)

    audit('Deliveries', 'Create Delivery', order.delivery.id, [
      created('Order', order.id),
      created('Method', input.method),
      created('Transport Cost', formatIDR(input.transportCost)),
      changed('Status', before, 'delivered'),
    ])
    return order.delivery
  })
}

/* ---------------------------- purchases ---------------------------- */

export interface NewPurchaseInput {
  supplierId: string
  date: string
  productId: string
  qty: number
  price: number
  paid: number
  account: string
  dueDate: string | null
}

export function createPurchase(input: NewPurchaseInput, features: Features) {
  return transaction(() => {
    if (!features.purchasing) throw new DomainError('err.featureDisabled')
    const supplier = supplierById(input.supplierId)
    const product = productById(input.productId)
    if (!supplier) throw new DomainError('err.unknownSupplier')
    if (!product) throw new DomainError('err.unknownProduct')
    if (!isDate(input.date)) throw new DomainError('err.invalidDate')
    if (!isPositiveInt(input.qty)) throw new DomainError('err.invalidQty')
    if (!isMoney(input.price)) throw new DomainError('err.invalidAmount')
    const total = input.qty * input.price
    if (!isMoney(input.paid) || input.paid > total) throw new DomainError('err.paymentExceeds')
    if (!features.supplierCredit && input.paid !== total) throw new DomainError('err.supplierCreditDisabled')
    if (input.paid > 0) assertAccount(input.account)

    const purchase = {
      id: nextSeq(purchases.map((p) => p.id), monthPrefix('PUR', input.date)),
      date: input.date,
      supplierId: supplier.id,
      items: [{ productId: product.id, qty: input.qty, price: input.price }],
      payments: [] as Payment[],
      dueDate: features.supplierCredit && input.dueDate ? input.dueDate : null,
      notes: '',
    }
    purchases.unshift(purchase)

    // Moving weighted average over on-hand (non-negative) stock.
    const onHand = Math.max(product.stock, 0)
    const beforeAvg = product.averageCost
    product.averageCost = Math.round((onHand * product.averageCost + input.qty * input.price) / (onHand + input.qty))
    const stockChange = moveStock(product.id, input.qty, 'purchase', purchase.id, input.date)
    postJournal(purchaseJournal(purchase))

    if (input.paid > 0) recordSupplierPayment(purchase, { date: input.date, account: input.account, amount: input.paid }, false)

    audit('Purchases', 'Create Purchase', purchase.id, [
      created('Supplier', supplier.name),
      created(product.name, `${input.qty} × ${formatIDR(input.price)}`),
      created('Total', formatIDR(total)),
      created('Paid', formatIDR(input.paid)),
      stockChange,
      changed(`${product.name} Average Cost`, formatIDR(beforeAvg), formatIDR(product.averageCost)),
    ])
    return purchase
  })
}

function recordSupplierPayment(purchase: (typeof purchases)[number], input: PaymentInput, log = true) {
  if (!isDate(input.date)) throw new DomainError('err.invalidDate')
  if (!isPositiveInt(input.amount)) throw new DomainError('err.invalidAmount')
  if (input.amount > purchaseOutstanding(purchase)) throw new DomainError('err.paymentExceeds')
  assertAccount(input.account)

  const beforePaid = purchasePaid(purchase)
  const beforeStatus = purchasePaymentStatus(purchase)
  const payment: Payment = { id: nextSeq(allSupplierPayments(), 'PAY-S-'), date: input.date, amount: input.amount, account: input.account }
  purchase.payments.push(payment)
  postJournal(supplierPaymentJournal(purchase, payment))

  if (log) {
    audit('Payables', 'Record Payment', purchase.id, [
      created('Payment', `${payment.id} · ${payment.account}`),
      changed('Paid', formatIDR(beforePaid), formatIDR(purchasePaid(purchase))),
      changed('Payment Status', beforeStatus, purchasePaymentStatus(purchase)),
    ])
  }
  return payment
}

export function addPurchasePayment(purchaseId: string, input: PaymentInput) {
  return transaction(() => {
    const purchase = purchaseById(purchaseId)
    if (!purchase) throw new DomainError('err.notFound')
    return recordSupplierPayment(purchase, input)
  })
}

/* ----------------------------- expenses ----------------------------- */

export function createExpense(input: Omit<Expense, 'id' | 'deletedAt'>) {
  return transaction(() => {
    if (!isDate(input.date)) throw new DomainError('err.invalidDate')
    if (!isPositiveInt(input.amount)) throw new DomainError('err.invalidAmount')
    if (!expenseCategories.includes(input.category)) throw new DomainError('err.invalidCategory')
    assertAccount(input.account)

    const expense: Expense = { ...input, description: input.description.trim(), id: nextSeq(expenses.map((e) => e.id), 'EXP-'), deletedAt: null }
    expenses.unshift(expense)
    postJournal(expenseJournal(expense))

    audit('Expenses', 'Create Expense', expense.id, [
      created('Category', expense.category),
      created('Amount', formatIDR(expense.amount)),
      created('Account', expense.account),
      created('Description', expense.description || '—'),
    ])
    return expense
  })
}

export function deleteExpense(expenseId: string) {
  return transaction(() => {
    const expense = expenses.find((e) => e.id === expenseId)
    if (!expense) throw new DomainError('err.notFound')
    if (expense.deletedAt) throw new DomainError('err.alreadyDeleted')
    expense.deletedAt = TODAY
    reverseJournals(expense.id, ['expense'], TODAY, `expense ${expense.id} deleted`)
    audit('Expenses', 'Delete Expense', expense.id, [changed('State', 'Active', 'Deleted'), changed('Amount', formatIDR(expense.amount), formatIDR(0))])
  })
}

export function restoreExpense(expenseId: string) {
  return transaction(() => {
    const expense = expenses.find((e) => e.id === expenseId)
    if (!expense) throw new DomainError('err.notFound')
    if (!expense.deletedAt) throw new DomainError('err.notDeleted')
    expense.deletedAt = null
    postJournal(expenseJournal(expense))
    audit('Expenses', 'Restore Expense', expense.id, [changed('State', 'Deleted', 'Active'), changed('Amount', formatIDR(0), formatIDR(expense.amount))])
  })
}

/* ------------------------------ stock ------------------------------ */

export function adjustStock(input: { productId: string; date: string; qty: number; reason: string }, features: Features) {
  return transaction(() => {
    if (!features.inventory) throw new DomainError('err.featureDisabled')
    const product = productById(input.productId)
    if (!product) throw new DomainError('err.unknownProduct')
    if (!isDate(input.date)) throw new DomainError('err.invalidDate')
    if (!Number.isInteger(input.qty) || input.qty === 0) throw new DomainError('err.invalidQty')

    const reference = nextSeq(stockMovements.filter((m) => m.type === 'adjustment').map((m) => m.reference), 'ADJ-')
    const stockChange = moveStock(product.id, input.qty, 'adjustment', reference, input.date)
    const value = input.qty * product.averageCost
    if (value !== 0) postJournal(adjustmentJournal(input.date, reference, value, input.reason.trim() || 'manual'))

    audit('Stock', 'Adjust Stock', reference, [stockChange, created('Reason', input.reason.trim() || '—'), created('Value', formatIDR(value))])
  })
}

/* ----------------------------- settings ----------------------------- */

export function logFeatureChange(feature: FeatureKey, previous: boolean, current: boolean) {
  transaction(() => {
    audit('Settings', 'Edit Settings', `feature.${feature}`, [changed(feature, previous ? 'On' : 'Off', current ? 'On' : 'Off')])
  })
}

export const orderTotals = (o: Order) => ({ total: orderTotal(o), outstanding: orderOutstanding(o) })
export const purchaseTotals = (id: string) => {
  const p = purchaseById(id)
  return p ? { total: purchaseTotal(p), outstanding: purchaseOutstanding(p) } : null
}
