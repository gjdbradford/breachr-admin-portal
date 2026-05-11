// admin/app/dashboard/packages/[packageId]/tabs/RoleCeilingsTab.tsx
'use client'

import type { ModuleSlug, AccessMode } from '@/lib/packages/types'
import type { Permission } from '@/lib/permissions'

type PermGroup = { label: string; permissions: { key: Permission; label: string }[] }

type Props = {
  permissionGroups: PermGroup[]
  moduleModes: Record<ModuleSlug, { mode: AccessMode; trialDays: number | null }>
  ceilings: Record<string, boolean>
  setCeiling: (role: 'admin' | 'member', permission: string, enabled: boolean) => void
}

const MODULE_FOR_GROUP: Record<string, ModuleSlug> = {
  'Scans': 'scans', 'Findings': 'findings', 'Assets / Inventory': 'assets',
  'Reports': 'reports', 'Exports': 'exports', 'Remediation': 'remediation',
  'Audit Log': 'audit', 'Team': 'team',
}

const MODE_LABEL: Record<AccessMode, string> = {
  full: 'Full', trial: 'Trial', paywalled: 'Paywalled', off: 'Off',
}
const MODE_COLOR: Record<AccessMode, string> = {
  full: 'rgba(34,197,94,.6)', trial: 'rgba(245,158,11,.6)',
  paywalled: 'rgba(66,165,245,.6)', off: 'rgba(100,116,139,.5)',
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 30, height: 17, borderRadius: 9,
        background: disabled ? 'rgba(255,255,255,.06)' : checked ? '#22c55e' : 'rgba(255,255,255,.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        position: 'relative', transition: '.2s', flexShrink: 0,
        display: 'inline-block',
      }}
    >
      <div style={{
        position: 'absolute', width: 13, height: 13, borderRadius: '50%',
        background: '#fff', top: 2,
        left: checked ? 15 : 2,
        transition: '.2s',
      }} />
    </div>
  )
}

export default function RoleCeilingsTab({ permissionGroups, moduleModes, ceilings, setCeiling }: Props) {
  function setAll(enabled: boolean) {
    for (const group of permissionGroups) {
      const modSlug = MODULE_FOR_GROUP[group.label]
      if (modSlug && moduleModes[modSlug]?.mode === 'off') continue
      for (const { key } of group.permissions) {
        setCeiling('admin', key, enabled)
        setCeiling('member', key, enabled)
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 3 }}>Role Permission Ceilings</div>
          <div style={{ fontSize: 11, color: '#475569' }}>Max permissions each role can have. Account owners always get everything.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#475569' }}>Quick set:</span>
          <button className="btn-s" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setAll(true)}>All on</button>
          <button className="btn-s" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setAll(false)}>All off</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.06)' }}>Permission</th>
            <th style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'center', width: 90, borderBottom: '1px solid rgba(255,255,255,.06)' }}>Admin</th>
            <th style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'center', width: 90, borderBottom: '1px solid rgba(255,255,255,.06)' }}>Member</th>
          </tr>
        </thead>
        <tbody>
          {permissionGroups.map(group => {
            const modSlug = MODULE_FOR_GROUP[group.label] as ModuleSlug | undefined
            const mode: AccessMode = modSlug ? (moduleModes[modSlug]?.mode ?? 'off') : 'full'
            const isOff = mode === 'off'
            return (
              <>
                <tr key={group.label}>
                  <td colSpan={3} style={{ background: 'rgba(255,255,255,.025)', color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', padding: '6px 12px' }}>
                    {group.label}
                    <span style={{ float: 'right', fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,.05)', color: MODE_COLOR[mode] }}>
                      {MODE_LABEL[mode]}
                    </span>
                  </td>
                </tr>
                {group.permissions.map(({ key, label }) => {
                  const adminOn  = ceilings[`admin:${key}`]  ?? true
                  const memberOn = ceilings[`member:${key}`] ?? false
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,.035)' }}>
                      <td style={{ padding: '7px 12px 7px 22px', color: isOff ? '#475569' : '#94a3b8', fontSize: 12 }}>
                        {label}
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569' }}>{key}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '7px 12px' }}>
                        <Toggle checked={adminOn}  disabled={isOff} onChange={v => setCeiling('admin', key, v)} />
                      </td>
                      <td style={{ textAlign: 'center', padding: '7px 12px' }}>
                        <Toggle checked={memberOn} disabled={isOff} onChange={v => setCeiling('member', key, v)} />
                      </td>
                    </tr>
                  )
                })}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
