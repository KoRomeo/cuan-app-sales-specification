import type { Metadata } from 'next'
import { AuthView } from '@/components/auth/auth-view'

export const metadata: Metadata = {
  title: 'Registration preview',
  description: 'Preview the CuanApp registration experience. No account is created.',
}

export default function RegisterPage() {
  return <AuthView mode="register" />
}

