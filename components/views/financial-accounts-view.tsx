'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Banknote, Landmark, Wallet, Plus, Power, ArrowLeftRight, CirclePlus, History } from 'lucide-react'
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
type FinancialAccount = { id: string; businessId: string; name: string; type: 'cash' | 'bank'; openingBalance: string; active: boolean; currentBalance?: number }
type CashAccount = FinancialAccount & { balance: number }
type CashTransaction = { id: string; date: string; kind: string; reference: string; description: string; lines: Array<{ account: string; debit: number; credit: number }> }
const TODAY = new Date().toLocaleDateString('en-CA')

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
  const [transactionMode, setTransactionMode] = useState<'money_in' | 'transfer' | null>(null)
  const [transactionDate, setTransactionDate] = useState(TODAY)
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionAccount, setTransactionAccount] = useState('')
  const [fromAccount, setFromAccount] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [category, setCategory] = useState('owner_capital')
  const [description, setDescription] = useState('')
  const [transactionSaving, setTransactionSaving] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: savedAccounts, error: accountsError, mutate: mutateAccounts } = useSWR<FinancialAccount[]>(
    business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, fetcher,
  )
  const { data: accounting, error: accountingError, mutate: mutateAccounting } = useSWR<AccountingSummary>(
    business?.id ? `/api/accounting?businessId=${encodeURIComponent(business.id)}` : null, fetcher,
  )
  const { data: history, error: historyError, mutate: mutateHistory } = useSWR<CashTransaction[]>(
    business?.id ? `/api/cash-transactions?businessId=${encodeURIComponent(business.id)}` : null, fetcher,
  )
  const ledger = accounting?.ledger ?? {}
  const accounts: CashAccount[] = (savedAccounts ?? []).map((account) => {
    const movement = ledger[account.name]
    const ledgerBalance = (movement?.debit ?? 0) - (movement?.credit ?? 0)
    return { ...account, balance: account.currentBalance ?? ledgerBalance }
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
      await Promise.all([mutateAccounts(), mutateAccounting(), mutateHistory()])
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

  async function saveTransaction() {
    if (!business?.id || !transactionMode) return
    setTransactionSaving(true); setFormError('')
    try {
      const payload = transactionMode === 'money_in'
        ? { businessId: business.id, action: transactionMode, date: transactionDate, amount: Number(transactionAmount), account: transactionAccount, category, description }
        : { businessId: business.id, action: transactionMode, date: transactionDate, amount: Number(transactionAmount), fromAccount, toAccount, description }
      const response = await fetch('/api/cash-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to save transaction')
      await Promise.all([mutateAccounts(), mutateAccounting(), mutateHistory()])
      setTransactionMode(null); setTransactionAmount(''); setDescription(''); setTransactionAccount(''); setFromAccount(''); setToAccount(''); setTransactionDate(TODAY)
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to save transaction') }
    finally { setTransactionSaving(false) }
  }

  const columns: Column<CashAccount>[] = [
    { key: 'code', header: t('reports.code'), cell: (account) => <IdCell>{account.id.slice(0, 11).toUpperCase()}</IdCell> },
    { key: 'name', header: t('common.account'), cell: (account) => <span className="font-medium">{account.name}</span> },
    { key: 'type', header: t('fin.type'), cell: (account) => <Pill tone={account.type === 'cash' ? 'warning' : 'primary'}>{account.type === 'cash' ? t('fin.cash') : t('fin.bank')}</Pill> },
    { key: 'balance', header: t('fin.currentBalance'), align: 'right', cell: (account) => <Money value={account.balance} className="font-semibold" /> },
    { key: 'status', header: 'Status', cell: (account) => <Pill tone={account.active ? 'success' : 'neutral'}>{account.active ? 'Active' : 'Inactive'}</Pill> },
    { key: 'ledger', header: t('reports.ledger'), align: 'right', cell: (account) => <div className="flex items-center justify-end gap-3"><Link href={`/reports/general-ledger?account=${encodeURIComponent(account.name)}`} className="text-xs font-medium text-primary hover:underline">{t('common.view')}</Link><Button type="button" size="sm" variant="ghost" onClick={() => toggleAccount(account)} title={account.active ? 'Deactivate account' : 'Activate account'}><Power className="h-4 w-4" /></Button></div> },
  ]

  if (accountsError || accountingError || historyError) return <p role="alert" className="text-sm text-destructive">{(accountsError ?? accountingError ?? historyError)?.message}</p>
  if (!business || !savedAccounts || !accounting || !history) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.finance') }, { label: t('reports.cash') }]} title="Cash & Bank" description={t('finance.accountsDesc')} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setTransactionMode('transfer'); setFormError('') }}><ArrowLeftRight className="mr-2 h-4 w-4" />Transfer funds</Button><Button variant="outline" onClick={() => { setTransactionMode('money_in'); setFormError('') }}><CirclePlus className="mr-2 h-4 w-4" />Add funds</Button><Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 h-4 w-4" />Add account</Button></div>} />
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
      {transactionMode && <section className="mb-5 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 font-semibold">{transactionMode === 'money_in' ? 'Add funds (Money In)' : 'Transfer between accounts'}</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="cash-transaction-date">Date</Label><Input id="cash-transaction-date" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="cash-transaction-amount">Amount (Rp)</Label><Input id="cash-transaction-amount" type="number" min="1" value={transactionAmount} onChange={(event) => setTransactionAmount(event.target.value)} placeholder="0" /></div>
          {transactionMode === 'money_in' ? <>
            <div className="space-y-2"><Label htmlFor="money-in-account">Deposit to</Label><select id="money-in-account" value={transactionAccount} onChange={(event) => setTransactionAccount(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select account</option>{activeAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="money-in-category">Source / category</Label><select id="money-in-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="owner_capital">Owner capital</option><option value="loan_received">Loan received</option><option value="other_income">Other income</option></select></div>
          </> : <>
            <div className="space-y-2"><Label htmlFor="transfer-from">From account</Label><select id="transfer-from" value={fromAccount} onChange={(event) => setFromAccount(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select source</option>{activeAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="transfer-to">To account</Label><select id="transfer-to" value={toAccount} onChange={(event) => setToAccount(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select destination</option>{activeAccounts.filter((item) => item.name !== fromAccount).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
          </>}
          <div className="space-y-2 md:col-span-2 xl:col-span-3"><Label htmlFor="cash-transaction-description">Description (optional)</Label><Input id="cash-transaction-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a note for the history" /></div>
        </div>
        {formError && <p role="alert" className="mt-3 text-sm text-destructive">{formError}</p>}
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => { setTransactionMode(null); setFormError('') }}>Cancel</Button><Button disabled={transactionSaving || !transactionDate || !Number.isFinite(Number(transactionAmount)) || Number(transactionAmount) <= 0 || (transactionMode === 'money_in' ? !transactionAccount : !fromAccount || !toAccount || fromAccount === toAccount)} onClick={saveTransaction}>{transactionSaving ? 'Saving…' : 'Save transaction'}</Button></div>
      </section>}
      <DataTable rows={accounts} columns={columns} getRowId={(account) => account.id} searchText={(account) => account.id + ' ' + account.name + ' ' + account.type + ' ' + (account.active ? 'active' : 'inactive')} editable={false} deletable={false} />
      <section className="mt-6 rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2"><History className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Cash & Bank history</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Transaction</th><th className="px-3 py-2">Description / reference</th><th className="px-3 py-2">Account movement</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody>
          {history.map((item) => { const cashLines = item.lines.filter((line) => accounts.some((account) => account.name === line.account)); const amount = cashLines.reduce((sum, line) => sum + line.debit, 0); const label = item.kind === 'money_in' ? 'Money in' : item.kind === 'transfer' ? 'Transfer' : item.kind === 'payment' ? 'Payment' : item.kind === 'expense' ? 'Expense' : 'Opening balance'; return <tr key={item.id} className="border-b last:border-0"><td className="whitespace-nowrap px-3 py-3">{item.date}</td><td className="px-3 py-3">{label}</td><td className="px-3 py-3"><div>{item.description}</div><div className="text-xs text-muted-foreground">{item.reference}</div></td><td className="px-3 py-3">{cashLines.map((line) => line.debit > 0 ? '+' + line.account : '−' + line.account).join(' · ')}</td><td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{formatIDR(amount || cashLines.reduce((sum, line) => sum + line.credit, 0))}</td></tr> })}
          {history.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No Cash & Bank transactions yet.</td></tr>}
        </tbody></table></div>
      </section>
    </>
  )
}
