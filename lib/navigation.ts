import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  FileText,
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PieChart,
  Receipt,
  RotateCcw,
  Scale,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Waves,
} from 'lucide-react'
import type { FeatureKey } from '@/components/providers'
import type { TranslationKey } from '@/lib/i18n'

export interface NavItem {
  href: string
  label: TranslationKey
  icon: LucideIcon
  feature?: FeatureKey
}

export interface NavSection {
  label: TranslationKey
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    label: 'nav.overview',
    items: [{ href: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'nav.sales',
    items: [
      { href: '/orders', label: 'nav.orders', icon: ShoppingCart },
      { href: '/customers', label: 'nav.customers', icon: Users },
      { href: '/invoices', label: 'nav.invoices', icon: FileText },
      { href: '/deliveries', label: 'nav.deliveries', icon: Truck },
      { href: '/replacements', label: 'nav.returns', icon: RotateCcw },
    ],
  },
  {
    label: 'nav.purchasing',
    items: [
      { href: '/purchases', label: 'nav.purchases', icon: ShoppingBag, feature: 'purchasing' },
      { href: '/suppliers', label: 'nav.suppliers', icon: Building2, feature: 'purchasing' },
    ],
  },
  {
    label: 'nav.inventory',
    items: [
      { href: '/products', label: 'nav.products', icon: Package, feature: 'inventory' },
      { href: '/stock', label: 'nav.stock', icon: Boxes, feature: 'inventory' },
      { href: '/stock-movements', label: 'nav.stockMovements', icon: ArrowLeftRight, feature: 'inventory' },
    ],
  },
  {
    label: 'nav.finance',
    items: [
      { href: '/receivables', label: 'nav.receivables', icon: HandCoins, feature: 'customerCredit' },
      { href: '/payables', label: 'nav.payables', icon: Wallet, feature: 'supplierCredit' },
      { href: '/expenses', label: 'nav.expenses', icon: Receipt },
      { href: '/financial-accounts', label: 'nav.financialAccounts', icon: Landmark },
    ],
  },
  {
    label: 'nav.reports',
    items: [
      { href: '/reports/sales', label: 'nav.salesReport', icon: BarChart3 },
      { href: '/reports/purchases', label: 'nav.purchaseReport', icon: ShoppingBag, feature: 'purchasing' },
      { href: '/reports/inventory', label: 'nav.inventoryReport', icon: Boxes, feature: 'inventory' },
      { href: '/profit-loss', label: 'nav.profitLoss', icon: PieChart },
      { href: '/reports/balance-sheet', label: 'nav.balanceSheet', icon: Scale, feature: 'accounting' },
      { href: '/reports/cash-flow', label: 'nav.cashFlow', icon: Waves, feature: 'accounting' },
      { href: '/reports/general-ledger', label: 'nav.generalLedger', icon: BookOpen, feature: 'accounting' },
    ],
  },
  {
    label: 'nav.activity',
    items: [{ href: '/history', label: 'nav.history', icon: History }],
  },
  {
    label: 'nav.settings',
    items: [{ href: '/settings', label: 'nav.settings', icon: Settings }],
  },
]
