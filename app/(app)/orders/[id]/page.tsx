import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrderDetailView } from '@/components/views/order-detail-view'
import { orderById } from '@/lib/data'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = orderById(id)
  if (!order) notFound()
  return <OrderDetailView order={order} />
}
