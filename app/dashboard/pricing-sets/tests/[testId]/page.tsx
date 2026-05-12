import { notFound } from 'next/navigation'
import { getAbTest, listPricingSets, getAbTestAnalytics } from '@/lib/pricing-sets/db'
import TestEditorClient from './TestEditorClient'

export default async function TestEditorPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params
  const isNew = testId === 'new'

  const [test, allSets, analytics] = await Promise.all([
    isNew ? null : getAbTest(testId),
    listPricingSets(),
    isNew ? null : getAbTestAnalytics(testId),
  ])

  if (!isNew && !test) notFound()

  return (
    <TestEditorClient
      test={test}
      allSets={allSets}
      isNew={isNew}
      analytics={analytics}
    />
  )
}
