export type PurchaseDiscountLine = { qty: number; unitCost: number; discount?: number; discountType?: 'amount' | 'percent' }

/**
 * Calculates each line at full precision, then rounds the invoice total once.
 * Integer line allocations always add up exactly to the rounded invoice total.
 */
export function calculatePurchaseLineTotals<T extends PurchaseDiscountLine>(items: T[], targetTotal?: number) {
  const exact = items.map((item) => {
    const gross = Number(item.qty) * Number(item.unitCost)
    const discount = item.discountType === 'percent'
      ? gross * Number(item.discount ?? 0) / 100
      : Number(item.discount ?? 0)
    return Math.max(0, gross - discount)
  })
  const exactTotal = exact.reduce((sum, amount) => sum + amount, 0)
  const roundedTotal = Number.isFinite(targetTotal) && targetTotal! >= 0
    ? Math.round(targetTotal!)
    : Math.ceil(exactTotal - 1e-9)
  const allocated = exact.map(Math.floor)
  let remainder = roundedTotal - allocated.reduce((sum, amount) => sum + amount, 0)
  const order = exact.map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  if (remainder > 0 && order.length) {
    for (let i = 0; i < remainder; i++) allocated[order[i % order.length].index] += 1
  } else if (remainder < 0 && order.length) {
    const reverse = [...order].reverse()
    for (let i = 0; i < Math.abs(remainder); i++) {
      const index = reverse[i % reverse.length].index
      if (allocated[index] > 0) allocated[index] -= 1
    }
  }
  return { lineTotals: allocated, exactLineTotals: exact, exactTotal, total: roundedTotal }
}
