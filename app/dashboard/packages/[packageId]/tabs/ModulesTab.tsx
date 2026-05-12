// admin/app/dashboard/packages/[packageId]/tabs/ModulesTab.tsx
'use client'

import { useState, useTransition } from 'react'
import type { ModuleSlug, AccessMode, PackagePushLog, EnvName } from '@/lib/packages/types'
import { pushToEnvAction, redactLogEntryAction } from '../actions'

const MODULE_ICONS: Record<ModuleSlug, string> = {
  scans: '⟳', findings: '⚠', assets: '⬡', reports: '▤',
  exports: '📦', remediation: '🔧', audit: '⛓', team: '👥',
}
const MODULE_LABELS: Record<ModuleSlug, string> = {
  scans: 'Scans', findings: 'Findings', assets: 'Inventory', reports: 'Reports',
  exports: 'Exports', remediation: 'Remediation', audit: 'Audit Log', team: 'Team',
}
const MODULE_PERM_COUNT: Record<ModuleSlug, number> = {
  scans: 4, findings: 3, assets: 4, reports: 6, exports: 2, remediation: 2, audit: 1, team: 2,
}
const MODE_STYLE: Record<AccessMode, { border: string; bg: string; pillBg: string; pillColor: string }> = {
  full:      { border: 'rgba(34,197,94,.3)',   bg: 'rgba(34,197,94,.03)',   pillBg: 'rgba(34,197,94,.15)',   pillColor: '#22c55e' },
  trial:     { border: 'rgba(245,158,11,.3)',  bg: 'rgba(245,158,11,.03)',  pillBg: 'rgba(245,158,11,.15)',  pillColor: '#f59e0b' },
  paywalled: { border: 'rgba(66,165,245,.3)',  bg: 'rgba(66,165,245,.03)',  pillBg: 'rgba(66,165,245,.15)',  pillColor: '#42a5f5' },
  off:       { border: 'rgba(100,116,139,.2)', bg: 'transparent',           pillBg: 'rgba(100,116,139,.12)', pillColor: '#475569' },
}

type Props = {
  moduleSlugList: ModuleSlug[]
  moduleModes: Record<ModuleSlug, { mode: AccessMode; trialDays: number | null }>
  setModuleMode: (slug: ModuleSlug, mode: AccessMode) => void
  setModuleTrialDays: (slug: ModuleSlug, days: number | null) => void
  packageId: string | null
  pushLog: PackagePushLog[]
  updatedAt: string
}

function envSyncState(log: PackagePushLog[], env: EnvName, updatedAt: string): 'synced' | 'stale' | 'never' {
  const lastSuccess = log.find(l => l.environment === env && l.status === 'success')
  if (!lastSuccess) return 'never'
  return new Date(lastSuccess.pushed_at) >= new Date(updatedAt) ? 'synced' : 'stale'
}

export default function ModulesTab({ moduleSlugList, moduleModes, setModuleMode, setModuleTrialDays, packageId, pushLog, updatedAt }: Props) {
  const [isPushing, startPush] = useTransition()
  const [pushingEnv, setPushingEnv] = useState<EnvName | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [localLog, setLocalLog] = useState<PackagePushLog[]>(pushLog)

  function handlePush(env: EnvName) {
    if (!packageId) { setPushError('Save the package first before pushing'); return }
    setPushError(null)
    setPushingEnv(env)
    startPush(async () => {
      const result = await pushToEnvAction(packageId, env)
      if (result.error) { setPushingEnv(null); setPushError(result.error) }
      else window.location.reload()
    })
  }

  async function handleRedact(logId: string) {
    const rollback = localLog.find(l => l.id === logId)
    setLocalLog(prev => prev.map(l => l.id === logId ? { ...l, status: 'redacted' as const, redacted_at: new Date().toISOString() } : l))
    const result = await redactLogEntryAction(logId)
    if (result.error && rollback) {
      setLocalLog(prev => prev.map(l => l.id === logId ? rollback : l))
    }
  }

  const stagingState  = envSyncState(localLog, 'staging', updatedAt)
  const prodState     = envSyncState(localLog, 'production', updatedAt)

  const dotColor = { synced: '#22c55e', stale: '#f59e0b', never: '#475569' } as const

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        Module Access — define what tenants on this package can see
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 28 }}>
        {moduleSlugList.map(slug => {
          const { mode, trialDays } = moduleModes[slug]
          const st = MODE_STYLE[mode]
          return (
            <div key={slug} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: 14, opacity: mode === 'off' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{MODULE_ICONS[slug]}</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: st.pillBg, color: st.pillColor, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {mode}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{MODULE_LABELS[slug]}</div>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>{MODULE_PERM_COUNT[slug]} permissions</div>
              <select
                value={mode}
                onChange={e => setModuleMode(slug, e.target.value as AccessMode)}
                style={{ width: '100%', background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11 }}
              >
                <option value="full">Full access</option>
                <option value="trial">Free trial</option>
                <option value="paywalled">Paywalled</option>
                <option value="off">Off</option>
              </select>
              {mode === 'trial' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 11, color: '#94a3b8' }}>
                  ⏱
                  <input
                    type="number"
                    value={trialDays ?? ''}
                    onChange={e => setModuleTrialDays(slug, e.target.value === '' ? null : Number(e.target.value))}
                    style={{ width: 44, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 4, padding: '2px 5px', color: '#f59e0b', fontSize: 11, textAlign: 'center' }}
                  />
                  days from first visit
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Deployment panel */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Environment Deployment</div>
      {pushError && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>{pushError}</div>}

      <div style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        {(['staging', 'production'] as EnvName[]).map(env => {
          const state = env === 'staging' ? stagingState : prodState
          const lastLog = localLog.find(l => l.environment === env && l.status === 'success')
          return (
            <div key={env} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: 'rgba(255,255,255,.02)', borderBottom: env === 'staging' ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor[state], boxShadow: `0 0 6px ${dotColor[state]}`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{env === 'staging' ? 'Staging' : 'Production'}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                  {state === 'never' ? 'Never pushed' : state === 'synced' ? `In sync · pushed ${new Date(lastLog!.pushed_at).toLocaleDateString('en-GB')}` : `Stale · last pushed ${new Date(lastLog!.pushed_at).toLocaleDateString('en-GB')}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {env === 'production' && lastLog && (
                  <button onClick={() => handleRedact(lastLog.id)} className="btn-s" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}>
                    ✕ Redact
                  </button>
                )}
                <button
                  onClick={() => handlePush(env)}
                  disabled={isPushing}
                  className={env === 'staging' ? 'btn-s' : 'btn-p'}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                >
                  {isPushing && pushingEnv === env ? '…' : env === 'staging' ? '▲ Push to Staging' : '✓ Push to Production'}
                </button>
              </div>
            </div>
          )
        })}

        {/* Push log */}
        <div style={{ padding: '9px 18px', background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.06em', textTransform: 'uppercase' }}>Deployment Log</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 80px 1fr 110px 80px 60px', gap: 10, padding: '6px 18px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <span>Time</span><span>Env</span><span>Changes</span><span>By</span><span>Status</span><span></span>
        </div>
        {localLog.slice(0, 10).map(entry => (
          <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '110px 80px 1fr 110px 80px 60px', gap: 10, alignItems: 'center', padding: '7px 18px', borderBottom: '1px solid rgba(255,255,255,.03)', fontSize: 11, color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>{new Date(entry.pushed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: entry.environment === 'staging' ? 'rgba(167,139,250,.12)' : 'rgba(34,197,94,.1)', color: entry.environment === 'staging' ? '#a78bfa' : '#22c55e', textTransform: 'uppercase', letterSpacing: '.04em', display: 'inline-block' }}>{entry.environment}</span>
            <span style={{ color: '#64748b', fontSize: 10 }}>{entry.changes_summary}</span>
            <span style={{ color: '#94a3b8' }}>{entry.pushed_by}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: entry.status === 'success' ? 'rgba(34,197,94,.1)' : entry.status === 'redacted' ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)', color: entry.status === 'success' ? '#22c55e' : entry.status === 'redacted' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase', letterSpacing: '.04em', display: 'inline-block' }}>{entry.status}</span>
            <span />
          </div>
        ))}
        {localLog.length === 0 && (
          <div style={{ padding: '14px 18px', fontSize: 11, color: '#475569', textAlign: 'center' }}>No pushes yet</div>
        )}
      </div>
    </div>
  )
}
