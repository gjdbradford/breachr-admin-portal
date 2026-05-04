import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#42a5f5', marginBottom: 2 }}>BREACHR</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Founder Admin</div>
          <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>Internal · Confidential</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Overview</div>
          <AdminNav />

          <div className="nav-section" style={{ marginTop: 8 }}>Product</div>
          <Link href="/dashboard/funnel" className="nav-item">⬡ Activation Funnel</Link>
          <Link href="/dashboard/usage" className="nav-item">◈ Usage & AI Metrics</Link>

          <div className="nav-section" style={{ marginTop: 8 }}>Revenue</div>
          <Link href="/dashboard/revenue" className="nav-item">$ MRR / ARR</Link>

          <div className="nav-section" style={{ marginTop: 8 }}>Operations</div>
          <Link href="/dashboard/scanning" className="nav-item">⟳ Concurrent Scans</Link>

          <div className="nav-section" style={{ marginTop: 8 }}>Customers</div>
          <Link href="/dashboard/tenants" className="nav-item">⊞ All Tenants</Link>
          <Link href="/dashboard/gdpr" className="nav-item">⚖ GDPR & Cancellations</Link>

          <div className="nav-section" style={{ marginTop: 8 }}>Red Team</div>
          <Link href="/dashboard/redteam" className="nav-item">⚔ Engagements</Link>

          <div className="nav-section" style={{ marginTop: 8 }}>AI & Config</div>
          <Link href="/dashboard/ai-training" className="nav-item">✦ AI Context</Link>
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#334155' }}>{user.email}</div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}
