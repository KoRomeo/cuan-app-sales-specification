import type { Metadata } from "next"
import { PurchaseDocumentsView } from "@/components/views/purchase-documents-view"
export const metadata: Metadata = { title: "AI Invoice Scanner" }
export default function PurchaseDocumentsPage() { return <PurchaseDocumentsView /> }
