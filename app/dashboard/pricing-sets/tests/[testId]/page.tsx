import { notFound } from 'next/navigation'
import { getAbTest, listPricingSets } from '@/lib/pricing-sets/db'
import TestEditorClient from './TestEditorClient'

export default async function TestEditorPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params
  const isNew = testId === 'new'

  const [test, allSets] = await Promise.all([
    isNew ? null : getAbTest(testId),
    listPricingSets(),
  ])

  if (!isNew && !test) notFound()

  return (
    <TestEditorClient
      test={test}
      allSets={allSets}
      isNew={isNew}
    />
  )
}
