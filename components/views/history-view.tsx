'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { history } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { translateAccountName, translateExpenseCategory, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type SortKey = 'id' | 'date' | 'time' | 'page' | 'action' | 'user'
type HistoryEntry = (typeof history)[number]

const sortKeys: Record<SortKey, (h: HistoryEntry) => string> = {
  id: (h) => h.id,
  date: (h) => `${h.date} ${h.time}`,
  time: (h) => h.time,
  page: (h) => h.page,
  action: (h) => h.action,
  user: (h) => h.user,
}

const pageLabelKeys: Partial<Record<string, TranslationKey>> = {
  Orders: 'nav.orders',
  Returns: 'nav.returns',
  Purchases: 'nav.purchases',
  Deliveries: 'nav.deliveries',
  Receivables: 'nav.receivables',
  Stock: 'nav.stock',
  Payables: 'nav.payables',
  Expenses: 'nav.expenses',
  Customers: 'nav.customers',
  Products: 'nav.products',
  Settings: 'nav.settings',
}

const actionLabelKeys: Partial<Record<string, TranslationKey>> = {
  'Create Order': 'history.action.createOrder',
  'Create Replacement': 'history.action.createReplacement',
  'Create Purchase': 'history.action.createPurchase',
  'Edit Order': 'history.action.editOrder',
  'Create Delivery': 'history.action.createDelivery',
  'Add Payment': 'history.action.addPayment',
  'Stock Adjustment': 'history.action.stockAdjustment',
  'Cancel Order': 'history.action.cancelOrder',
  'Create Expense': 'history.action.createExpense',
  'Edit Customer': 'history.action.editCustomer',
  'Edit Product': 'history.action.editProduct',
  'Delete Product': 'history.action.deleteProduct',
  'Create Business': 'history.action.createBusiness',
}

const propertyLabelKeys: Partial<Record<string, TranslationKey>> = {
  Customer: 'common.customer',
  Status: 'common.status',
  Total: 'common.total',
  Paid: 'common.paid',
  Order: 'history.property.order',
  Product: 'common.product',
  'Replacement Outstanding': 'orders.replacementOutstanding',
  Supplier: 'common.supplier',
  Method: 'orders.method',
  'Transport Cost': 'orders.transportCost',
  Amount: 'common.amount',
  Outstanding: 'common.outstanding',
  Stock: 'history.property.stock',
  Reason: 'stock.reason',
  Purchase: 'history.property.purchase',
  Category: 'common.category',
  Phone: 'common.phone',
  'Selling Price': 'products.sellingPrice',
  'Deleted At': 'history.property.deletedAt',
  'Business Name': 'settings.businessName',
  Currency: 'settings.currency',
  'Costing Method': 'settings.costing',
}

const valueLabelKeys: Partial<Record<string, TranslationKey>> = {
  Requested: 'history.value.requested',
  'Ready to Deliver': 'history.value.readyToDeliver',
  Cancelled: 'history.value.cancelled',
  'Own Delivery': 'history.value.ownDelivery',
  'Moving Weighted Average': 'history.value.movingWeightedAverage',
  '0 (reversed)': 'history.value.reversed',
}

export function HistoryView() {
  const { t } = useApp()
  const localizeProperty = (property: string) => {
    const key = propertyLabelKeys[property]
    if (key) return t(key)
    const productPrice = property.match(/^(.*) Price$/)
    if (productPrice) return t('history.property.productPrice', { product: productPrice[1] })
    const productStock = property.match(/^(.*) Stock$/)
    if (productStock) return t('history.property.productStock', { product: productStock[1] })
    return property
  }
  const localizeValue = (value: string) => {
    const key = valueLabelKeys[value]
    if (key) return t(key)
    const accountName = translateAccountName(value, t)
    return accountName === value ? translateExpenseCategory(value, t) : accountName
  }
  const [openId, setOpenId] = useState<string | null>(history[0]?.id ?? null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  const rows = useMemo(() => {
    if (!sort) return history
    const get = sortKeys[sort.key]
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...history].sort((a, b) => get(a).localeCompare(get(b), undefined, { numeric: true }) * factor)
  }, [sort])

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev?.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null))

  const headers: { key: SortKey; label: string }[] = [
    { key: 'id', label: t('history.recordId') },
    { key: 'date', label: t('common.date') },
    { key: 'time', label: t('history.time') },
    { key: 'page', label: t('history.page') },
    { key: 'action', label: t('history.action') },
    { key: 'user', label: t('history.user') },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.activity') }, { label: t('nav.history') }]} title={t('history.title')} description={t('history.desc')} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-[800px] text-sm">
          <caption className="sr-only">{t('history.title')}</caption>
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {headers.map((h) => {
                const dir = sort?.key === h.key ? sort.dir : null
                const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <th key={h.key} scope="col" className="px-4 py-3 font-medium" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
                    <button type="button" onClick={() => toggleSort(h.key)} className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      {h.label}
                      <Icon className={cn('size-3', dir ? 'text-foreground' : 'opacity-50')} />
                    </button>
                  </th>
                )
              })}
              <th scope="col" className="w-10 px-4 py-3">
                <span className="sr-only">{t('history.changes')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">{t('history.empty')}</td>
              </tr>
            )}
            {rows.map((h) => {
              const open = openId === h.id
              return (
                <Fragment key={h.id}>
                  <tr className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{h.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(h.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.time}</td>
                    <td className="px-4 py-3">{pageLabelKeys[h.page] ? t(pageLabelKeys[h.page]!) : h.page}</td>
                    <td className="px-4 py-3">
                      <Pill tone={h.action.startsWith('Create') ? 'success' : h.action.startsWith('Delete') ? 'destructive' : 'primary'}>{actionLabelKeys[h.action] ? t(actionLabelKeys[h.action]!) : h.action}</Pill>
                    </td>
                    <td className="px-4 py-3">{h.user}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-controls={`history-changes-${h.id}`} aria-label={t(open ? 'history.hideChanges' : 'history.toggleChanges', { id: h.id })} onClick={() => setOpenId(open ? null : h.id)}>
                        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                  {open && (
                    <tr id={`history-changes-${h.id}`} className="border-b bg-muted/20">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="mb-2 font-mono text-xs text-muted-foreground">{h.reference}</p>
                        <table className="w-full max-w-3xl text-xs">
                          <caption className="sr-only">{t('history.changes')}</caption>
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th scope="col" className="py-1.5 pr-4 font-medium">{t('history.property')}</th>
                              <th scope="col" className="py-1.5 pr-4 font-medium">{t('history.previous')}</th>
                              <th scope="col" className="py-1.5 font-medium">{t('history.current')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.changes.map((c) => (
                              <tr key={c.property} className="border-t">
                                <td className="py-1.5 pr-4 font-medium">{localizeProperty(c.property)}</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{localizeValue(c.previous)}</td>
                                <td className="py-1.5">{localizeValue(c.current)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
