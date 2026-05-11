// admin/app/dashboard/packages/page.tsx
import Link from 'next/link'
import { listPackages } from '@/lib/packages/db'
import type { PackageListItem, AccessMode } from '@/lib/packages/types'

const MODE_COLORS: Record<AccessMode, string> = {
  full:      'rgba(34,197,94,.12)',
  trial:     'rgba(245,158,11,.12)',
  paywalled: 'rgba(66,165,245,.12)',
  off:       'rgba(100,116,139,.06)',
}
const MODE_TEXT: Record<AccessMode, string> = {
  full: '#22c55e', trial: '#f59e0b', paywalled: '#42a5f5', off: '#475569',
}

function SyncChip({ label, pushedAt, updatedAt }: { label: string; pushedAt: string | null; updatedAt: string }) {
  if (!pushedAt) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'rgba(100,116,139,.08)', color: '#475569', border: '1px solid rgba(100,116,139,.15)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {label}: never
    </span>
  )
  const inSync = new Date(pushedAt) >= new Date(updatedAt)
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: inSync ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', color: inSync ? '#22c55e' : '#f59e0b', border: `1px solid ${inSync ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.25)'}`, textTransform: 'uppercase', letterSpacing: '.05em' }}>
      ● {label}: {inSync ? 'synced' : 'stale'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:   'badge-green',
    draft:    'badge-grey',
    archived: 'badge-red',
  }
  return <span className={`badge ${styles[status] ?? 'badge-grey'}`}>{status}</span>
}

function PackageCard({ pkg }: { pkg: PackageListItem }) {
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${pkg.status === 'archived' ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, padding: 18, opacity: pkg.status === 'archived' ? 0.55 : 1, borderStyle: pkg.status === 'draft' ? 'dashed' : 'solid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{pkg.name}</div>
          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>{pkg.slug}</div>
        </div>
        <StatusBadge status={pkg.status} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
        {pkg.price_monthly === 0 ? 'Free' : `€${pkg.price_monthly}`}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#475569' }}> / mo</span>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        <strong>{pkg.tenant_count}</strong> tenants
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
        {pkg.modules.map(m => (
          <span key={m.module_slug} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: MODE_COLORS[m.access_mode], color: MODE_TEXT[m.access_mode], textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {m.module_slug}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <SyncChip label="Staging" pushedAt={pkg.last_push_staging} updatedAt={pkg.updated_at} />
          <SyncChip label="Prod"    pushedAt={pkg.last_push_production} updatedAt={pkg.updated_at} />
        </div>
        {pkg.status !== 'archived' && (
          <Link href={`/dashboard/packages/${pkg.id}`} style={{ fontSize: 11, color: '#42a5f5', textDecoration: 'none', fontWeight: 600 }}>Edit →</Link>
        )}
      </div>
    </div>
  )
}

export default async function PackagesPage() {
  const packages = await listPackages()
  const active = packages.filter(p => p.status === 'active')
  const draft  = packages.filter(p => p.status === 'draft')
  const archived = packages.filter(p => p.status === 'archived')

  const archivedWithTenants = archived.filter(p => p.tenant_count > 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Packages</div>
          <div className="page-sub">{packages.length} packages · {active.length} active · {draft.length} draft</div>
        </div>
        <Link href="/dashboard/packages/new" className="btn-p">+ New Package</Link>
      </div>

      {archivedWithTenants.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#fca5a5' }}>
          ⚠ {archivedWithTenants.map(p => <span key={p.id}><strong>{p.name}</strong> is archived but has <strong>{p.tenant_count} tenants</strong> still assigned. </span>)}
          <Link href="#" style={{ color: '#42a5f5', marginLeft: 4 }}>Reassign →</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {packages.map(pkg => <PackageCard key={pkg.id} pkg={pkg} />)}
        <Link href="/dashboard/packages/new" style={{ textDecoration: 'none', border: '1px dashed rgba(66,165,245,.2)', background: 'rgba(66,165,245,.02)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 9, color: '#42a5f5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(66,165,245,.1)', border: '1px solid rgba(66,165,245,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
          New Package
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>Scratch or duplicate existing</div>
        </Link>
      </div>
    </>
  )
}
