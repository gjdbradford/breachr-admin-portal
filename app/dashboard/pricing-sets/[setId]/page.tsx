import { notFound } from 'next/navigation'
import { getPricingSet } from '@/lib/pricing-sets/db'
import { listPackages } from '@/lib/packages/db'
import SetEditorClient from './SetEditorClient'

export default async function SetEditorPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params
  const isNew = setId === 'new'

  const [set, allPackages] = await Promise.all([
    isNew ? null : getPricingSet(setId),
    listPackages(),
  ])

  if (!isNew && !set) notFound()

  return (
    <SetEditorClient
      set={set}
      allPackages={allPackages.filter(p => p.status !== 'archived')}
      isNew={isNew}
    />
  )
}
