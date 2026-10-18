import {
  ArrowLeftRight,
  BarChart3,
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
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
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
      { href: '/returns', label: 'nav.returns', icon: RotateCcw },
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
      { href: '/financial-accounts', label: 'reports.cash', icon: Landmark },
      { href: '/expenses', label: 'nav.expenses', icon: Receipt },
      { href: '/profit-loss', label: 'nav.profitLoss', icon: PieChart },
    ],
  },
  {
    label: 'nav.reports',
    items: [{ href: '/reports', label: 'nav.allReports', icon: BarChart3 }],
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
