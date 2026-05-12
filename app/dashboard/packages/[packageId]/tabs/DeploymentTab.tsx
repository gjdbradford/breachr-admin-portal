// admin/app/dashboard/packages/[packageId]/tabs/DeploymentTab.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { PackagePushLog, EnvName } from '@/lib/packages/types'
import { pushToEnvAction, redactLogEntryAction } from '../actions'

type Props = {
  packageId: string
  pushLog: PackagePushLog[]
  updatedAt: string
}

function envSyncState(log: PackagePushLog[], env: EnvName, updatedAt: string): 'synced' | 'stale' | 'never' {
  const lastSuccess = log.find(l => l.environment === env && l.status === 'success')
  if (!lastSuccess) return 'never'
  return new Date(lastSuccess.pushed_at) >= new Date(updatedAt) ? 'synced' : 'stale'
}

export default function DeploymentTab({ packageId, pushLog, updatedAt }: Props) {
  const [isPushing, startPush] = useTransition()
  const [pushingEnv, setPushingEnv] = useState<EnvName | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [localLog, setLocalLog] = useState<PackagePushLog[]>(pushLog)

  function handlePush(env: EnvName) {
    setPushError(null)
    setPushingEnv(env)
    startPush(async () => {
      const result = await pushToEnvAction(packageId, env)
      if (result.error) {
        setPushingEnv(null)
        setPushError(result.error)
        toast.error(`Push to ${env} failed: ${result.error}`)
      } else {
        toast.success(`Successfully deployed to ${env === 'staging' ? 'Staging' : 'Production'}`)
        setTimeout(() => window.location.reload(), 1200)
      }
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

  const stagingState = envSyncState(localLog, 'staging', updatedAt)
  const prodState    = envSyncState(localLog, 'production', updatedAt)
  const dotColor = { synced: '#22c55e', stale: '#f59e0b', never: '#475569' } as const

  return (
    <div>
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
