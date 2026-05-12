// admin/app/dashboard/packages/page.tsx
import Link from 'next/link'
import { listPackages } from '@/lib/packages/db'
import PackagesListClient from './PackagesListClient'

export default async function PackagesPage() {
  const packages = await listPackages()
  const active   = packages.filter(p => p.status === 'active').length
  const draft    = packages.filter(p => p.status === 'draft').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Packages</div>
          <div className="page-sub">{packages.length} packages · {active} active · {draft} draft</div>
        </div>
        <Link href="/dashboard/packages/new" className="btn-p">+ New Package</Link>
      </div>

      <PackagesListClient initialPackages={packages} />
    </>
  )
}
