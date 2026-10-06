const numberFormat = new Intl.NumberFormat('id-ID')

export function formatIDR(value: number) {
  const formatted = `Rp${numberFormat.format(Math.abs(Math.round(value)))}`
  return value < 0 ? `-${formatted}` : formatted
}

export function formatCompactIDR(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)} rb`
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
