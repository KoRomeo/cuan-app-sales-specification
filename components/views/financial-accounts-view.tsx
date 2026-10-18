'use client'

import Link from 'next/link'
import { Banknote, Landmark, Wallet } from 'lucide-react'
import useSWR from 'swr'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { type Column, DataTable, IdCell, Money } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { formatIDR } from '@/lib/format'

type AccountingSummary = { ledger: Record<string, { debit: number; credit: number }> }
type CashAccount = { code: string; name: string; type: 'Cash' | 'Bank'; balance: number }

const fetcher = async (url: string): Promise<AccountingSummary> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load Cash & Bank balances')
  return response.json()
}

export function FinancialAccountsView() {
  const { t } = useApp()
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Unable to load business')
    return response.json()
  })
  const { data, error } = useSWR<AccountingSummary>(
    business?.id ? `/api/accounting?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )
  const ledger = data?.ledger ?? {}
  const names = new Set(['Cash', ...Object.keys(ledger).filter((name) => /^(bank|bca|bni|mandiri|bri|bsi|cash)/i.test(name))])
  const accounts: CashAccount[] = [...names].map((name) => ({
    code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    type: /cash/i.test(name) ? 'Cash' : 'Bank',
    balance: Number(((ledger[name]?.debit ?? 0) - (ledger[name]?.credit ?? 0)).toFixed(2)),
  })).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  const total = accounts.reduce((sum, account) => sum + account.balance, 0)
  const cash = accounts.filter((account) => account.type === 'Cash').reduce((sum, account) => sum + account.balance, 0)

  const columns: Column<CashAccount>[] = [
    { key: 'code', header: t('reports.code'), cell: (account) => <IdCell>{account.code.toUpperCase()}</IdCell> },
    { key: 'name', header: t('common.account'), cell: (account) => <span className="font-medium">{account.name}</span> },
    { key: 'type', header: t('fin.type'), cell: (account) => <Pill tone={account.type === 'Cash' ? 'warning' : 'primary'}>{account.type === 'Cash' ? t('fin.cash') : t('fin.bank')}</Pill> },
    { key: 'balance', header: t('fin.currentBalance'), align: 'right', cell: (account) => <Money value={account.balance} className="font-semibold" /> },
    { key: 'ledger', header: t('reports.ledger'), align: 'right', cell: (account) => <Link href={`/reports/general-ledger?account=${encodeURIComponent(account.name)}`} className="text-xs font-medium text-primary hover:underline">{t('common.view')}</Link> },
  ]

  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !data) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.finance') }, { label: t('reports.cash') }]} title={t('reports.cash')} description="Review cash and bank balances calculated from recorded financial transactions." />
      <KpiGrid>
        <KpiCard label={t('fin.totalBalance')} value={formatIDR(total)} icon={Landmark} />
        <KpiCard label={t('fin.cash')} value={formatIDR(cash)} icon={Banknote} tone="warning" />
        <KpiCard label={t('fin.bank')} value={formatIDR(total - cash)} icon={Wallet} tone="success" />
      </KpiGrid>
      <DataTable rows={accounts} columns={columns} getRowId={(account) => account.code} searchText={(account) => `${account.code} ${account.name}`} editable={false} deletable={false} />
    </>
  )
}
