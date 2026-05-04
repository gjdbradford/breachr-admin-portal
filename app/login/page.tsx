'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useSearchParams()
  const unauthorized = params.get('error') === 'unauthorized'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    console.log('[login] env check — url:', url ? url.slice(0, 30) + '…' : 'MISSING', 'key:', key ? 'present' : 'MISSING')

    if (!url || !key) {
      setError('Configuration error: Supabase env vars missing. Check Vercel environment settings.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient(url, key)
      console.log('[login] calling signInWithPassword…')
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      console.log('[login] result — error:', authErr?.message ?? 'none', 'user:', data?.user?.id ?? 'none')

      if (authErr) {
        setError(authErr.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('[login] unexpected error:', err)
      setError(err?.message ?? 'Unexpected error — check console')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 8 }}>BREACHR</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Founder Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Internal access only — superusers only</p>
        </div>

        {unauthorized && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
            Your account does not have superuser access.
          </div>
        )}

        <div className="card">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@breachr.ai" autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{ fontSize: 11, color: 'var(--red)' }}>{error}</p>}
            <button type="submit" className="btn-p" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
