'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const CATEGORIES = ['probe_rules', 'vulnerability_types', 'remediation_templates', 'system_prompt', 'owasp_context']

type Context = {
  id: string; name: string; category: string; content: string;
  enabled: boolean; version: number; notes: string | null; created_at: string;
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    probe_rules:             'badge-blue',
    vulnerability_types:     'badge-amber',
    remediation_templates:   'badge-green',
    system_prompt:           'badge-purple',
    owasp_context:           'badge-grey',
  }
  return map[cat] ?? 'badge-grey'
}

export default function AITrainingEditor({ initialContexts }: { initialContexts: Context[] }) {
  const [contexts, setContexts]   = useState(initialContexts)
  const [selected, setSelected]   = useState<Context | null>(null)
  const [creating, setCreating]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filtered = filterCat === 'all' ? contexts : contexts.filter(c => c.category === filterCat)

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    if (creating) {
      const { data, error } = await db.from('ai_training_context').insert({
        name:     selected.name,
        category: selected.category,
        content:  selected.content,
        enabled:  selected.enabled,
        notes:    selected.notes,
      }).select().single()
      if (!error && data) {
        setContexts(prev => [data as Context, ...prev])
        setSelected(data as Context)
        setCreating(false)
      }
    } else {
      const { error } = await db.from('ai_training_context').update({
        name:     selected.name,
        category: selected.category,
        content:  selected.content,
        enabled:  selected.enabled,
        notes:    selected.notes,
        version:  (selected.version ?? 1) + 1,
      }).eq('id', selected.id)
      if (!error) {
        setContexts(prev => prev.map(c => c.id === selected.id ? { ...selected, version: (selected.version ?? 1) + 1 } : c))
      }
    }
    setSaving(false)
  }

  async function handleToggle(ctx: Context) {
    await db.from('ai_training_context').update({ enabled: !ctx.enabled }).eq('id', ctx.id)
    setContexts(prev => prev.map(c => c.id === ctx.id ? { ...c, enabled: !c.enabled } : c))
    if (selected?.id === ctx.id) setSelected(s => s ? { ...s, enabled: !s.enabled } : s)
  }

  function handleNew() {
    setSelected({ id: '', name: '', category: 'probe_rules', content: '', enabled: true, version: 1, notes: '', created_at: '' })
    setCreating(true)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 600 }}>
      {/* List */}
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleNew} className="btn-p" style={{ fontSize: 11, padding: '7px 12px', flexShrink: 0 }}>+ New</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(ctx => (
            <div
              key={ctx.id}
              onClick={() => { setSelected(ctx); setCreating(false) }}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: selected?.id === ctx.id ? 'rgba(66,165,245,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selected?.id === ctx.id ? 'rgba(66,165,245,0.4)' : 'rgba(255,255,255,0.05)'}`,
                opacity: ctx.enabled ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className={`badge ${categoryColor(ctx.category)}`} style={{ fontSize: 8 }}>{ctx.category}</span>
                {!ctx.enabled && <span className="badge badge-red" style={{ fontSize: 8 }}>disabled</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{ctx.name || 'Untitled'}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>v{ctx.version}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ fontSize: 12, color: '#475569', padding: '20px 12px', textAlign: 'center' }}>
              No context entries yet.<br />Click + New to add one.
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{creating ? 'New Context Entry' : 'Edit Context'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!creating && (
                <button onClick={() => handleToggle(selected)} className="btn-s" style={{ fontSize: 11 }}>
                  {selected.enabled ? 'Disable' : 'Enable'}
                </button>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-p" style={{ fontSize: 11 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}>Name</label>
              <input value={selected.name} onChange={e => setSelected(s => s ? { ...s, name: e.target.value } : s)} placeholder="e.g. SQL injection probe rules" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}>Category</label>
              <select value={selected.category} onChange={e => setSelected(s => s ? { ...s, category: e.target.value } : s)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}>Content</label>
            <textarea
              value={selected.content}
              onChange={e => setSelected(s => s ? { ...s, content: e.target.value } : s)}
              rows={16}
              style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
              placeholder="Enter the context, rules, or prompt content that will be injected into the scanner AI..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}>Internal Notes</label>
            <input value={selected.notes ?? ''} onChange={e => setSelected(s => s ? { ...s, notes: e.target.value } : s)} placeholder="Why was this added? What does it improve?" />
          </div>

          {!creating && (
            <div style={{ fontSize: 10, color: '#334155' }}>
              Version {selected.version} · Added {new Date(selected.created_at).toLocaleDateString('en-GB')}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>
          Select a context entry to edit, or click + New
        </div>
      )}
    </div>
  )
}
