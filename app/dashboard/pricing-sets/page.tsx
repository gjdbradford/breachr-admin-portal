import Link from 'next/link'
import { listPricingSets, listAbTests } from '@/lib/pricing-sets/db'
import PricingSetsClient from './PricingSetsClient'

export default async function PricingSetsPage() {
  const [sets, tests] = await Promise.all([listPricingSets(), listAbTests()])
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Website Pricing</div>
          <div className="page-sub">Scheduled collections of pricing cards · A/B test variants</div>
        </div>
        <Link href="/dashboard/pricing-sets/new" className="btn-p">+ New Set</Link>
      </div>
      <PricingSetsClient sets={sets} tests={tests} />
    </>
  )
}
