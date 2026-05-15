// admin/app/dashboard/guides/page.tsx
import Link from 'next/link'
import { listGuideSets } from '@/lib/guides/db'

export default async function GuidesPage() {
  const guides = await listGuideSets()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Guides</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Step-by-step onboarding guides served inside the client portal.</p>
        </div>
        <Link href="/dashboard/guides/new" style={{ padding: '8px 16px', background: 'rgba(25,118,210,0.85)', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(25,118,210,0.5)' }}>
          + New Guide
        </Link>
      </div>

      {guides.length === 0 ? (
        <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '48px 0' }}>No guides yet. Create your first guide above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Title', 'Route', 'Roles', 'Auto-open', 'Status'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '8px 12px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guides.map(g => (
              <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/dashboard/guides/${g.id}`} style={{ fontSize: 13, color: '#e2e8f0', textDecoration: 'none', fontWeight: 600 }}>{g.title}</Link>
                  {g.description && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{g.description}</div>}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{g.route}</td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{g.roles.join(', ') || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{g.auto_open}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em',
                    background: g.is_published ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    color:      g.is_published ? '#4ade80'              : '#fbbf24',
                    border:     `1px solid ${g.is_published ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    {g.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
