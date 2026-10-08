import type { Metadata } from 'next'
import { AuthView } from '@/components/auth/auth-view'

export const metadata: Metadata = {
  title: 'Sign in preview',
  description: 'Preview the CuanApp sign-in experience. Authentication is not connected.',
}

export default function LoginPage() {
  return <AuthView mode="login" />
}

