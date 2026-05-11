// admin/app/dashboard/packages/[packageId]/tabs/TenantsTab.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import type { PackageListItem } from '@/lib/packages/types'
import { reassignTenantAction } from '../actions'

type Props = {
  packageId: string | null
  allPackages: PackageListItem[]
}

export default function TenantsTab({ packageId, allPackages }: Props) {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [reassigning, startReassign] = useTransition()

  useEffect(() => {
    if (!packageId) return
    setLoading(true)
    fetch(`/api/admin/packages/${packageId}/tenants`)
      .then(r => r.json())
      .then(data => { setTenants(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [packageId])

  if (!packageId) return <div style={{ color: '#475569', fontSize: 12 }}>Save the package first.</div>
  if (loading) return <div style={{ color: '#475569', fontSize: 12 }}>Loading…</div>

  function handleReassign(tenantId: string, newPkgId: string) {
    startReassign(async () => {
      await reassignTenantAction(tenantId, newPkgId)
      setTenants(prev => prev.filter(t => t.tenant?.id !== tenantId))
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {tenants.length} tenants on this package
        </div>
      </div>
      {tenants.length === 0 ? (
        <div style={{ fontSize: 12, color: '#475569', padding: '20px 0' }}>No tenants assigned yet.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Assigned</th>
              <th>Trial modules</th>
              <th>Stripe Sub</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((row: any) => {
              const t = row.tenant ?? {}
              const trials: any[] = row.trials ?? []
              const activeTrial = trials.find((tr: any) => new Date(tr.expires_at) > new Date())
              return (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>{t.name ?? t.id}</div>
                    {t.subdomain && <div style={{ fontSize: 10, color: '#475569' }}>{t.subdomain}.breachr.ai</div>}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(row.assigned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    <div style={{ fontSize: 10, color: '#475569' }}>{row.override_reason ? 'manual override' : row.stripe_sub_id ? 'via Stripe' : '—'}</div>
                  </td>
                  <td>
                    {activeTrial ? (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,.1)', color: '#f59e0b', textTransform: 'uppercase' }}>
                        {activeTrial.module_slug} active
                      </span>
                    ) : trials.length > 0 ? (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,68,68,.1)', color: '#ef4444', textTransform: 'uppercase' }}>expired</span>
                    ) : (
                      <span style={{ fontSize: 9, color: '#475569' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'monospace' }}>
                    {row.stripe_sub_id ?? '—'}
                  </td>
                  <td>
                    <select
                      defaultValue=""
                      disabled={reassigning}
                      onChange={e => { if (e.target.value) handleReassign(t.id, e.target.value) }}
                      style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}
                    >
                      <option value="" disabled>Reassign…</option>
                      {allPackages.filter(p => p.id !== packageId && p.status === 'active').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
