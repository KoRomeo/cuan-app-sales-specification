import type { Metadata } from 'next'
import { OnboardingView } from '@/components/onboarding/onboarding-view'

export const metadata: Metadata = {
  title: 'Workspace setup preview',
  description: 'Preview business workspace onboarding without creating an account or saving data.',
}

export default function OnboardingPage() {
  return <OnboardingView />
}

