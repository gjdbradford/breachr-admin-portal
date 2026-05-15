'use client'

import type { GuideSetRow, GuideStepRow, GuideStats } from '@/lib/guides/db'

export default function GuideEditorClient({
  guideSet,
  steps,
  stats,
  allGuides,
}: {
  guideSet: GuideSetRow
  steps: GuideStepRow[]
  stats: GuideStats
  allGuides: GuideSetRow[]
}) {
  return <div style={{ color: '#e2e8f0', padding: 24 }}>Editor for: {guideSet.title}</div>
}
