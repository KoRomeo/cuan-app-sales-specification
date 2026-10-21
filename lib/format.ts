const numberFormat = new Intl.NumberFormat('id-ID')

export function formatIDR(value: number) {
  const formatted = `Rp${numberFormat.format(Math.abs(Math.round(value)))}`
  return value < 0 ? `-${formatted}` : formatted
}

export function formatCompactIDR(value: number) {
  // Keep the full rupiah amount everywhere; never abbreviate with rb/jt or hide digits.
  return formatIDR(value)
}

export function formatNumber(value: number) {
  return numberFormat.format(value)
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')}%`
}
