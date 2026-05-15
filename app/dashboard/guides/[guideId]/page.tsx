import { notFound } from 'next/navigation'
import { getGuideSet, getGuideStats, listGuideSets } from '@/lib/guides/db'
import GuideEditorClient from './GuideEditorClient'

export default async function GuideEditorPage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params
  const result = await getGuideSet(guideId)
  if (!result) notFound()

  const [stats, allGuides] = await Promise.all([
    getGuideStats(guideId),
    listGuideSets(),
  ])

  return (
    <GuideEditorClient
      guideSet={result.guideSet}
      steps={result.steps}
      stats={stats}
      allGuides={allGuides.filter(g => g.id !== guideId)}
    />
  )
}
