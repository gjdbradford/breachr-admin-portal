'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  saveGuideSetAction, deleteGuideSetAction,
  saveGuideStepAction, deleteGuideStepAction, reorderGuideStepsAction,
} from './actions'
import type { GuideSetRow, GuideStepRow, GuideStats } from '@/lib/guides/db'

const ALL_ROLES = ['account_owner', 'admin', 'member', 'viewer', 'developer', 'superuser'] as const
const AUTO_OPEN_OPTIONS = [
  { value: 'first_visit', label: 'First visit only' },
  { value: 'always',      label: 'Always' },
  { value: 'never',       label: 'Never (manual only)' },
] as const

type Link = { label: string; href: string; external: boolean }

function hasTarget(s: GuideStepRow)  { return !!s.target_selector }
function hasImage(s: GuideStepRow)   { return !!s.image_url }
function hasVideo(s: GuideStepRow)   { return !!s.video_url }

export default function GuideEditorClient({
  guideSet: initial,
  steps: initialSteps,
  stats,
  allGuides,
}: {
  guideSet: GuideSetRow
  steps: GuideStepRow[]
  stats: GuideStats
  allGuides: GuideSetRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Guide set state
  const [title, setTitle]             = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [route, setRoute]             = useState(initial.route)
  const [roles, setRoles]             = useState<string[]>(initial.roles)
  const [autoOpen, setAutoOpen]       = useState(initial.auto_open)
  const [nextGuideId, setNextGuideId] = useState<string>(initial.next_guide_id ?? '')
  const [isPublished, setIsPublished] = useState(initial.is_published)

  // Steps state
  const [steps, setSteps]               = useState<GuideStepRow[]>(initialSteps)
  const [activeStepId, setActiveStepId] = useState<string | null>(initialSteps[0]?.id ?? null)

  const activeStep = steps.find(s => s.id === activeStepId) ?? null

  // Step field state (controlled by activeStep)
  const [stepTitle, setStepTitle]       = useState(activeStep?.title ?? '')
  const [stepBody, setStepBody]         = useState(activeStep?.body ?? '')
  const [stepImageUrl, setStepImageUrl] = useState(activeStep?.image_url ?? '')
  const [stepVideoUrl, setStepVideoUrl] = useState(activeStep?.video_url ?? '')
  const [stepSelector, setStepSelector] = useState(activeStep?.target_selector ?? '')
  const [stepLinks, setStepLinks]       = useState<Link[]>(activeStep?.links ?? [])

  function selectStep(step: GuideStepRow) {
    setActiveStepId(step.id)
    setStepTitle(step.title)
    setStepBody(step.body)
    setStepImageUrl(step.image_url ?? '')
    setStepVideoUrl(step.video_url ?? '')
    setStepSelector(step.target_selector ?? '')
    setStepLinks(step.links)
  }

  function toggleRole(r: string) {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  async function handleSaveGuideSet() {
    startTransition(async () => {
      const result = await saveGuideSetAction({
        id: initial.id,
        title, description, route,
        roles, auto_open: autoOpen as GuideSetRow['auto_open'],
        next_guide_id: nextGuideId || null,
        is_published: isPublished,
      })
      if (result.error) toast.error(result.error)
      else { toast.success('Guide saved'); router.refresh() }
    })
  }

  async function handleSaveStep() {
    if (!activeStep) return
    startTransition(async () => {
      const result = await saveGuideStepAction({
        id: activeStep.id,
        guide_set_id: initial.id,
        title: stepTitle,
        body: stepBody,
        image_url: stepImageUrl || null,
        video_url: stepVideoUrl || null,
        target_selector: stepSelector || null,
        links: stepLinks,
      })
      if (result.error) toast.error(result.error)
      else {
        toast.success('Step saved')
        setSteps(prev => prev.map(s => s.id === activeStep.id
          ? { ...s, title: stepTitle, body: stepBody, image_url: stepImageUrl || null, video_url: stepVideoUrl || null, target_selector: stepSelector || null, links: stepLinks }
          : s
        ))
      }
    })
  }

  async function handleAddStep() {
    startTransition(async () => {
      const result = await saveGuideStepAction({
        guide_set_id: initial.id,
        step_order: steps.length + 1,
        title: 'New step',
        body: '',
        links: [],
      })
      if (result.error) { toast.error(result.error); return }
      router.refresh()
    })
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return
    startTransition(async () => {
      const result = await deleteGuideStepAction(stepId)
      if (result.error) { toast.error(result.error); return }
      const remaining = steps.filter(s => s.id !== stepId)
      setSteps(remaining)
      if (remaining[0]) selectStep(remaining[0])
      else setActiveStepId(null)
    })
  }

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => { await deleteGuideSetAction(initial.id) })
  }

  function handlePickFromPortal() {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? ''
    if (!portalUrl) { toast.error('NEXT_PUBLIC_PORTAL_URL not configured'); return }
    const popup = window.open(`${portalUrl}/?guide-inspect=1`, 'guide-inspector', 'width=1280,height=860')
    if (!popup) { toast.error('Popup blocked — allow popups for this site'); return }
    function onMessage(e: MessageEvent) {
      try {
        if (e.origin !== new URL(portalUrl).origin) return
      } catch { return }
      if (e.data?.type !== 'guide-target-selected') return
      if (e.data.route) setRoute(e.data.route)
      if (e.data.selector) setStepSelector(e.data.selector)
      toast.success(`Captured: ${e.data.selector ?? e.data.route}`)
      window.removeEventListener('message', onMessage)
    }
    window.addEventListener('message', onMessage)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const fieldLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const fieldInput: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }
  const fieldTextarea: React.CSSProperties = { ...fieldInput, resize: 'vertical' as const, minHeight: 72 }
  const divider: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }

  const analyticsRows: Array<[string, number, string]> = [
    ['Started',       stats.started,    '#94a3b8'],
    ['Completed',     stats.completed,  '#94a3b8'],
    ['Helpful',       stats.thumbsUp,   '#4ade80'],
    ['Not helpful',   stats.thumbsDown, '#f87171'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em', background: isPublished ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: isPublished ? '#4ade80' : '#fbbf24', border: `1px solid ${isPublished ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
          {isPublished ? 'Published' : 'Draft'}
        </span>
        <button onClick={handleSaveGuideSet} disabled={isPending} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'rgba(25,118,210,0.85)', color: '#fff', border: '1px solid rgba(25,118,210,0.5)', cursor: 'pointer' }}>
          {isPending ? 'Saving…' : 'Save guide'}
        </button>
        <button onClick={handleDelete} style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
          Delete
        </button>
      </div>

      {/* Three-column editor */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* Step list */}
        <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', padding: '0 14px 8px' }}>STEPS</div>
          {steps.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => selectStep(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: activeStepId === s.id ? 'rgba(66,165,245,0.08)' : 'transparent', borderLeft: activeStepId === s.id ? '2px solid #42a5f5' : '2px solid transparent' }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: activeStepId === s.id ? 'rgba(66,165,245,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: activeStepId === s.id ? '#42a5f5' : '#64748b', flexShrink: 0 }}>
                {idx + 1}
              </div>
              <span style={{ fontSize: 11, color: activeStepId === s.id ? '#e2e8f0' : '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {hasTarget(s) && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>target</span>}
                {hasImage(s)  && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>img</span>}
                {hasVideo(s)  && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>vid</span>}
              </div>
            </div>
          ))}
          <button onClick={handleAddStep} disabled={isPending} style={{ margin: '10px 14px', padding: 7, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.1)', color: '#475569', fontSize: 11, background: 'none', cursor: 'pointer', textAlign: 'center' }}>
            + Add step
          </button>
        </div>

        {/* Step editor */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeStep ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 14 }}>
                Step {steps.findIndex(s => s.id === activeStepId) + 1} of {steps.length}
                <button onClick={() => handleDeleteStep(activeStep.id)} style={{ marginLeft: 12, fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>Delete step</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Step Title</label>
                <input style={fieldInput} value={stepTitle} onChange={e => setStepTitle(e.target.value)} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Body <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9, color: '#334155' }}>(markdown: **bold**, *italic*, bullet lists)</span></label>
                <textarea style={fieldTextarea} value={stepBody} onChange={e => setStepBody(e.target.value)} rows={4} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={fieldLabel}>Screenshot URL <span style={{ fontWeight: 400 }}>optional</span></label>
                  <input style={fieldInput} value={stepImageUrl} onChange={e => setStepImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label style={fieldLabel}>Video URL <span style={{ fontWeight: 400 }}>optional</span></label>
                  <input style={fieldInput} value={stepVideoUrl} onChange={e => setStepVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ ...fieldLabel, color: '#a78bfa' }}>Element Target <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9, color: '#64748b' }}>optional — CSS selector to pulse-highlight on this step</span></label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...fieldInput, fontFamily: 'monospace', fontSize: 11 }} value={stepSelector} onChange={e => setStepSelector(e.target.value)} placeholder={`[data-guide-target="element-name"]`} />
                  <button onClick={handlePickFromPortal} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Pick from portal &rarr;
                  </button>
                </div>
                <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>
                  Add <code style={{ color: '#a78bfa' }}>data-guide-target=&quot;name&quot;</code> to the element in portal JSX first.
                </div>
              </div>

              {/* Links */}
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Links <span style={{ fontWeight: 400 }}>optional</span></label>
                {stepLinks.map((link, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input style={{ ...fieldInput, flex: '0 0 140px' }} value={link.label} onChange={e => setStepLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} placeholder="Label" />
                    <input style={{ ...fieldInput, flex: 1 }} value={link.href} onChange={e => setStepLinks(prev => prev.map((l, j) => j === i ? { ...l, href: e.target.value } : l))} placeholder="/dashboard/targets or https://..." />
                    <label style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={link.external} onChange={e => setStepLinks(prev => prev.map((l, j) => j === i ? { ...l, external: e.target.checked } : l))} /> External
                    </label>
                    <button onClick={() => setStepLinks(prev => prev.filter((_, j) => j !== i))} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>&times;</button>
                  </div>
                ))}
                <button onClick={() => setStepLinks(prev => [...prev, { label: '', href: '', external: false }])} style={{ fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>+ Add link</button>
              </div>

              <button onClick={handleSaveStep} disabled={isPending} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'rgba(25,118,210,0.85)', color: '#fff', border: '1px solid rgba(25,118,210,0.5)', cursor: 'pointer' }}>
                {isPending ? 'Saving…' : 'Save step'}
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '40px 0' }}>Add a step to get started.</p>
          )}
        </div>

        {/* Guide settings sidebar */}
        <div style={{ width: 240, borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Guide Settings</div>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>Title</label>
              <input style={fieldInput} value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>Description</label>
              <input style={fieldInput} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>Route</label>
              <input style={{ ...fieldInput, fontFamily: 'monospace', fontSize: 11 }} value={route} onChange={e => setRoute(e.target.value)} placeholder="/dashboard" />
            </div>
            <div>
              <label style={fieldLabel}>Auto-open</label>
              <select style={{ ...fieldInput, color: '#94a3b8' }} value={autoOpen} onChange={e => setAutoOpen(e.target.value as GuideSetRow['auto_open'])}>
                {AUTO_OPEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={divider} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Target Roles</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {ALL_ROLES.map(r => (
                <button key={r} onClick={() => toggleRole(r)} style={{ padding: '3px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: roles.includes(r) ? '1px solid rgba(66,165,245,0.35)' : '1px solid rgba(255,255,255,0.07)', background: roles.includes(r) ? 'rgba(66,165,245,0.15)' : 'rgba(255,255,255,0.03)', color: roles.includes(r) ? '#42a5f5' : '#475569' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={divider} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Chain to next guide</div>
            <select style={{ ...fieldInput, color: '#94a3b8', fontSize: 11 }} value={nextGuideId} onChange={e => setNextGuideId(e.target.value)}>
              <option value="">None</option>
              {allGuides.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>Shows a &ldquo;Continue &rarr;&rdquo; button at guide completion.</div>
          </div>

          <div style={divider} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Published</div>
            <button
              onClick={() => setIsPublished(p => !p)}
              style={{ width: 36, height: 20, borderRadius: 10, background: isPublished ? '#1976d2' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: 3, left: isPublished ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div style={divider} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Analytics</div>
            {analyticsRows.map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
