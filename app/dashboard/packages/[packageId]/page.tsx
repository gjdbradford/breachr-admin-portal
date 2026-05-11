// admin/app/dashboard/packages/[packageId]/page.tsx
import { notFound } from 'next/navigation'
import { getPackage, listPackages } from '@/lib/packages/db'
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permissions'
import { MODULE_SLUGS } from '@/lib/packages/types'
import PackageEditorClient from './PackageEditorClient'

export default async function PackageEditorPage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params

  const isNew = packageId === 'new'

  const pkg = isNew ? null : await getPackage(packageId)
  if (!isNew && !pkg) notFound()

  const allPackages = await listPackages()

  return (
    <PackageEditorClient
      pkg={pkg}
      allPackages={allPackages}
      allPermissions={ALL_PERMISSIONS}
      permissionGroups={PERMISSION_GROUPS}
      moduleSlugList={MODULE_SLUGS}
      isNew={isNew}
    />
  )
}
