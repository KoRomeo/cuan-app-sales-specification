'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Banknote, Landmark, Wallet, Plus, Power } from 'lucide-react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { type Column, DataTable, IdCell, Money } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { formatIDR } from '@/lib/format'

type LedgerLine = { debit: number; credit: number }
type AccountingSummary = { ledger: Record<string, LedgerLine> }
type FinancialAccount = { id: string; businessId: string; name: string; type: 'cash' | 'bank'; openingBalance: string; active: boolean }
type CashAccount = FinancialAccount & { balance: number }

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load financial data')
  return response.json()
}

export function FinancialAccountsView() {
  const { t } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'cash' | 'bank'>('bank')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: savedAccounts, error: accountsError, mutate: mutateAccounts } = useSWR<FinancialAccount[]>(
    business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, fetcher,
  )
  const { data: accounting, error: accountingError } = useSWR<AccountingSummary>(
    business?.id ? `/api/accounting?businessId=${encodeURIComponent(business.id)}` : null, fetcher,
  )
  const ledger = accounting?.ledger ?? {}
  const accounts: CashAccount[] = (savedAccounts ?? []).map((account) => {
    const movement = ledger[account.name]
    return { ...account, balance: (movement?.debit ?? 0) - (movement?.credit ?? 0) }
  }).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
  const activeAccounts = accounts.filter((account) => account.active)
  const total = activeAccounts.reduce((sum, account) => sum + account.balance, 0)
  const cash = activeAccounts.filter((account) => account.type === 'cash').reduce((sum, account) => sum + account.balance, 0)

  async function createAccount() {
    if (!business?.id || !name.trim()) return
    setSaving(true)
    setFormError('')
    try {
      const response = await fetch('/api/financial-accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, name: name.trim(), type, openingBalance: Number(openingBalance) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to create account')
      await mutateAccounts()
      setName('')
      setType('bank')
      setOpeningBalance('0')
      setShowForm(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create account')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAccount(account: FinancialAccount) {
    if (!business?.id) return
    const response = await fetch('/api/financial-accounts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, id: account.id, active: !account.active }),
    })
    const result = await response.json()
    if (!response.ok) setFormError(result.error ?? 'Unable to update account')
    else await mutateAccounts()
  }

  const columns: Column<CashAccount>[] = [
    { key: 'code', header: t('reports.code'), cell: (account) => <IdCell>{account.id.slice(0, 11).toUpperCase()}</IdCell> },
    { key: 'name', header: t('common.account'), cell: (account) => <span className="font-medium">{account.name}</span> },
    { key: 'type', header: t('fin.type'), cell: (account) => <Pill tone={account.type === 'cash' ? 'warning' : 'primary'}>{account.type === 'cash' ? t('fin.cash') : t('fin.bank')}</Pill> },
    { key: 'balance', header: t('fin.currentBalance'), align: 'right', cell: (account) => <Money value={account.balance} className="font-semibold" /> },
    { key: 'status', header: 'Status', cell: (account) => <Pill tone={account.active ? 'success' : 'neutral'}>{account.active ? 'Active' : 'Inactive'}</Pill> },
    { key: 'ledger', header: t('reports.ledger'), align: 'right', cell: (account) => <div className="flex items-center justify-end gap-3"><Link href={`/reports/general-ledger?account=${encodeURIComponent(account.name)}`} className="text-xs font-medium text-primary hover:underline">{t('common.view')}</Link><Button type="button" size="sm" variant="ghost" onClick={() => toggleAccount(account)} title={account.active ? 'Deactivate account' : 'Activate account'}><Power className="h-4 w-4" /></Button></div> },
  ]

  if (accountsError || accountingError) return <p role="alert" className="text-sm text-destructive">{(accountsError ?? accountingError)?.message}</p>
  if (!business || !savedAccounts || !accounting) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.finance') }, { label: t('reports.cash') }]} title="Cash & Bank" description="Manage the cash and bank accounts used to receive payments and pay business expenses." actions={<Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 h-4 w-4" />Add account</Button>} />
      <KpiGrid>
        <KpiCard label={t('fin.totalBalance')} value={formatIDR(total)} icon={Landmark} />
        <KpiCard label={t('fin.cash')} value={formatIDR(cash)} icon={Banknote} tone="warning" />
        <KpiCard label={t('fin.bank')} value={formatIDR(total - cash)} icon={Wallet} tone="success" />
      </KpiGrid>
      {showForm && <section className="mb-5 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 font-semibold">Add financial account</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="account-name">Account name</Label><Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Bank BCA" /></div>
          <div className="space-y-2"><Label htmlFor="account-type">Account type</Label><select id="account-type" value={type} onChange={(event) => setType(event.target.value as 'cash' | 'bank')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="cash">Cash</option><option value="bank">Bank</option></select></div>
          <div className="space-y-2"><Label htmlFor="opening-balance">Opening balance (Rp)</Label><Input id="opening-balance" type="number" min="0" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></div>
        </div>
        {formError && <p role="alert" className="mt-3 text-sm text-destructive">{formError}</p>}
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => { setShowForm(false); setFormError('') }}>Cancel</Button><Button disabled={saving || !name.trim() || Number(openingBalance) < 0} onClick={createAccount}>{saving ? 'Saving…' : 'Save account'}</Button></div>
      </section>}
      <DataTable rows={accounts} columns={columns} getRowId={(account) => account.id} searchText={(account) => `${account.id} ${account.name} ${account.type} ${account.active ? 'active' : 'inactive'}`} editable={false} deletable={false} />
    </>
  )
}
