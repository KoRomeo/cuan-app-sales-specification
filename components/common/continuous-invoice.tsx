'use client'

import type { CSSProperties } from 'react'
import type { Order } from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'
import { lineSubtotal, orderTotal } from '@/lib/data'

type Customer = { id: string; name: string; address?: string | null } | null | undefined

export function ContinuousInvoice({
  order,
  customer,
  productNames = {},
}: {
  order: Order
  customer?: Customer
  productNames?: Record<string, string>
}) {
  const grossSubtotal = order.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0)
  const lineDiscount = order.items.reduce((sum, item) => sum + Math.max(0, Number(item.qty) * Number(item.price) - lineSubtotal(item)), 0)
  const expanded = order.items.length > 10
  const height = 5.5 + Math.max(0, order.items.length - 10) * 0.25
  const style = { '--invoice-height': `${height}in` } as CSSProperties

  return (
    <article className={`continuous-invoice ${expanded ? 'continuous-invoice-expanded' : ''}`} style={style}>
      <header className="continuous-invoice-header">
        <div className="continuous-invoice-meta">
          <div>No. Faktur: <strong>{order.id}</strong></div>
          <div>J. Tempo: {order.dueDate ? formatDate(order.dueDate) : '—'}</div>
          <div>Salesman: —</div>
        </div>
        <div className="continuous-invoice-recipient">
          <h1>FAKTUR</h1>
          <p>Pontianak, {formatDate(order.date)}</p>
          <p>Kepada Yth,</p>
          <strong>{customer?.name ?? order.customerId}</strong>
          {customer?.address && <p>{customer.address}</p>}
        </div>
      </header>

      <table className="continuous-invoice-table">
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '34%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '19%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>No</th><th>Nama Barang</th><th>Kwantitas</th><th>Harga</th><th>Discount</th><th>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => {
            const gross = Number(item.qty) * Number(item.price)
            const discount = Math.max(0, gross - lineSubtotal(item))
            return (
              <tr key={`${item.productId}-${index}`}>
                <td className="center">{index + 1}</td>
                <td>{productNames[item.productId] ?? item.productId}</td>
                <td className="center">{item.qty}</td>
                <td className="right">{formatIDR(Number(item.price))}</td>
                <td className="right">{discount ? formatIDR(discount) : '—'}</td>
                <td className="right">{formatIDR(lineSubtotal(item))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <footer className="continuous-invoice-footer">
        <div className="continuous-invoice-receipt">
          <p>Tanda Terima,</p>
          <div className="continuous-invoice-signature" />
        </div>
        <div className="continuous-invoice-terms">
          Barang yang sudah dibeli tidak dapat ditukar/dikembalikan
        </div>
        <div className="continuous-invoice-summary">
          <div><span>Subtotal</span><span>{formatIDR(grossSubtotal)}</span></div>
          <div><span>Disc 1</span><span>{formatIDR(lineDiscount)}</span></div>
          <div><span>Disc 2</span><span>—</span></div>
          <div><span>Disc 3</span><span>—</span></div>
          <div className="continuous-invoice-total"><strong>TOTAL</strong><strong>{formatIDR(orderTotal(order))}</strong></div>
          <div className="continuous-invoice-company">
            <p>Hormat kami,</p>
            <div className="continuous-invoice-signature" />
          </div>
        </div>
      </footer>
    </article>
  )
}
