'use client'

import Link from 'next/link'
import { Banknote, Landmark, Wallet } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { type Column, DataTable, IdCell, Money } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { accountBalance, chartOfAccounts, type LedgerAccount } from '@/lib/accounting'
import { TODAY } from '@/lib/data'

export function FinancialAccountsView() {
  const { t } = useApp()
  const accounts = chartOfAccounts.filter((a) => a.isCash)
  const balances = new Map(accounts.map((a) => [a.code, accountBalance(a.code, TODAY)]))
  const total = [...balances.values()].reduce((s, v) => s + v, 0)
  const cash = balances.get('1100') ?? 0

  const columns: Column<LedgerAccount>[] = [
    { key: 'code', header: t('reports.code'), cell: (a) => <IdCell>{a.code}</IdCell> },
    { key: 'name', header: t('common.account'), cell: (a) => <span className="font-medium">{a.name}</span> },
    {
      key: 'type',
      header: t('fin.type'),
      cell: (a) => <Pill tone={a.code === '1100' ? 'warning' : 'primary'}>{a.code === '1100' ? t('fin.cash') : t('fin.bank')}</Pill>,
    },
    { key: 'balance', header: t('fin.currentBalance'), align: 'right', cell: (a) => <Money value={balances.get(a.code) ?? 0} className="font-semibold" /> },
    {
      key: 'ledger',
      header: t('reports.ledger'),
      align: 'right',
      cell: () => (
        <Link href="/reports/general-ledger" className="text-xs font-medium text-primary hover:underline">
          {t('common.view')}
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.finance') }, { label: t('fin.title') }]} title={t('fin.title')} description={t('fin.desc')} />
      <KpiGrid>
        <KpiCard label={t('fin.totalBalance')} value={<Money value={total} />} icon={Landmark} />
        <KpiCard label={t('fin.cash')} value={<Money value={cash} />} icon={Banknote} tone="warning" />
        <KpiCard label={t('fin.bank')} value={<Money value={total - cash} />} icon={Wallet} tone="success" />
      </KpiGrid>
      <DataTable
        rows={accounts}
        columns={columns}
        getRowId={(a) => a.code}
        searchText={(a) => `${a.code} ${a.name}`}
        editable={false}
        deletable={false}
      />
    </>
  )
}
