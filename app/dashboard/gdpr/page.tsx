import { createServiceClient } from '@/lib/supabase/server'

const statusColor: Record<string, string> = {
  pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444',
  processing: '#42a5f5', completed: '#475569',
}

export default async function GdprPage() {
  const db = createServiceClient()

  const [{ data: _deletions }, { data: _cancellations }, { data: _auditLog }] = await Promise.all([
    db.from('deletion_requests')
      .select('*, tenants(name), users(email)')
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('cancellations')
      .select('*, tenants(name, plan, mrr_eur)')
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('deletion_audit_log')
      .select('*')
      .order('deleted_at', { ascending: false })
      .limit(20),
  ])

  const deletions     = (_deletions     ?? []) as any[]
  const cancellations = (_cancellations ?? []) as any[]
  const auditLog      = (_auditLog      ?? []) as any[]

  const pendingDeletions = deletions.filter(d => d.status === 'pending')

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">GDPR & Cancellations</div>
          <div className="page-sub">
            {pendingDeletions.length > 0
              ? `⚠ ${pendingDeletions.length} deletion request${pendingDeletions.length > 1 ? 's' : ''} pending action`
              : 'All deletion requests processed'}
          </div>
        </div>
      </div>

      {/* Pending deletion requests — action required */}
      {pendingDeletions.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 16 }}>
            ⚠ Right to Be Forgotten — Pending ({pendingDeletions.length})
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
            GDPR Art. 17 requires deletion within 30 days of request. Action required below.
          </p>
          <table className="data-table">
            <thead>
              <tr><th>Tenant</th><th>Requested By</th><th>Reason</th><th>Requested</th><th>Deadline</th><th>Action</th></tr>
            </thead>
            <tbody>
              {pendingDeletions.map(d => {
                const deadline = new Date(new Date(d.created_at).getTime() + 30 * 86400_000)
                const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400_000)
                return (
                  <tr key={d.id}>
                    <td style={{ fontSize: 12, color: '#e2e8f0' }}>{d.tenants?.name ?? '—'}</td>
                    <td style={{ fontSize: 11, color: '#94a3b8' }}>{d.users?.email ?? d.requested_by_email ?? '—'}</td>
                    <td style={{ fontSize: 11, color: '#64748b', maxWidth: 200 }}>{d.reason ?? 'No reason given'}</td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontSize: 11, fontWeight: 700, color: daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : '#22c55e' }}>
                      {daysLeft > 0 ? `${daysLeft}d left` : 'OVERDUE'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <form action={`/api/gdpr/approve/${d.id}`} method="POST">
                          <button type="submit" className="btn-danger" style={{ fontSize: 10, padding: '4px 10px' }}>
                            Approve & Delete
                          </button>
                        </form>
                        <form action={`/api/gdpr/reject/${d.id}`} method="POST">
                          <button type="submit" className="btn-s" style={{ fontSize: 10, padding: '4px 10px' }}>
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* All deletion requests */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
          All Deletion Requests
        </div>
        {deletions.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 12, color: '#475569' }}>No deletion requests received</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Tenant</th><th>Email</th><th>Status</th><th>Reason</th><th>Requested</th><th>Resolved</th></tr>
            </thead>
            <tbody>
              {deletions.map(d => (
                <tr key={d.id}>
                  <td style={{ fontSize: 12, color: '#e2e8f0' }}>{d.tenants?.name ?? '—'}</td>
                  <td style={{ fontSize: 11, color: '#94a3b8' }}>{d.users?.email ?? d.requested_by_email ?? '—'}</td>
                  <td><span className="badge" style={{ color: statusColor[d.status], background: `${statusColor[d.status]}15`, border: `1px solid ${statusColor[d.status]}30` }}>{d.status}</span></td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>{d.reason ?? '—'}</td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {d.resolved_at ? new Date(d.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancellations */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
          Subscription Cancellations
        </div>
        {cancellations.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 12, color: '#475569' }}>No cancellations recorded</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Tenant</th><th>Plan</th><th>MRR Lost</th><th>Reason</th><th>Access Until</th><th>Cancelled</th></tr>
            </thead>
            <tbody>
              {cancellations.map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize: 12, color: '#e2e8f0' }}>{c.tenants?.name ?? '—'}</td>
                  <td><span className="badge badge-grey" style={{ textTransform: 'capitalize' }}>{c.tenants?.plan ?? '—'}</span></td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#ef4444' }}>
                    {c.tenants?.mrr_eur ? `-€${c.tenants.mrr_eur}` : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b', maxWidth: 200 }}>{c.reason ?? '—'}</td>
                  <td style={{ fontSize: 11, color: '#94a3b8' }}>
                    {c.access_until ? new Date(c.access_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deletion audit log */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>Deletion Audit Log</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Non-PII record only — required by GDPR to prove compliance</div>
        </div>
        {auditLog.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 12, color: '#475569' }}>No deletions completed yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Reference ID</th><th>Data Purged</th><th>Completed By</th><th>Date</th></tr>
            </thead>
            <tbody>
              {auditLog.map(a => (
                <tr key={a.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155' }}>{a.deletion_request_id}</td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>{a.data_categories_purged ?? 'all'}</td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>{a.completed_by ?? 'system'}</td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(a.deleted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
