export type PackageStatus = 'draft' | 'active' | 'archived'
export type PackageBadge = 'best_value' | 'most_popular'
export type FeatureItemKind = 'item' | 'section' | 'highlight'

export interface PackageFeatureItem {
  id: string
  text: string
  kind: FeatureItemKind
  icon?: string
}
export type ModuleSlug = 'scans' | 'findings' | 'assets' | 'reports' | 'exports' | 'remediation' | 'audit' | 'team'
export type AccessMode = 'full' | 'trial' | 'paywalled' | 'off'
export type EnvName = 'staging' | 'production'

export const MODULE_SLUGS: ModuleSlug[] = [
  'scans', 'findings', 'assets', 'reports', 'exports', 'remediation', 'audit', 'team',
]

export interface Package {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_annual: number | null
  is_poa: boolean
  scans_limit: number | null
  tokens_limit: number | null
  targets_limit: number | null
  scan_types: string[]
  stripe_product_id: string | null
  status: PackageStatus
  features: PackageFeatureItem[]
  badge: PackageBadge | null
  cta_label: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface PackageModule {
  id: string
  package_id: string
  module_slug: ModuleSlug
  access_mode: AccessMode
  trial_days: number | null
}

export interface PackageRoleCeiling {
  id: string
  package_id: string
  role: 'admin' | 'member'
  permission: string
  enabled: boolean
}

export interface PackagePushLog {
  id: string
  package_id: string
  environment: EnvName
  pushed_by: string
  pushed_at: string
  changes_summary: string
  status: 'success' | 'failed' | 'redacted'
  redacted_at: string | null
  redacted_by: string | null
}

export interface PackageListItem extends Package {
  modules: PackageModule[]
  tenant_count: number
  last_push_staging: string | null
  last_push_production: string | null
}

export interface PackageDetail extends Package {
  modules: PackageModule[]
  ceilings: PackageRoleCeiling[]
  push_log: PackagePushLog[]
  tenant_count: number
}

export interface SavePackagePayload {
  id: string | null
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_annual: number | null
  is_poa: boolean
  scans_limit: number | null
  tokens_limit: number | null
  targets_limit: number | null
  scan_types: string[]
  stripe_product_id: string | null
  status: PackageStatus
  features: PackageFeatureItem[]
  badge: PackageBadge | null
  cta_label: string | null
  modules: Array<{ module_slug: ModuleSlug; access_mode: AccessMode; trial_days: number | null }>
  ceilings: Array<{ role: 'admin' | 'member'; permission: string; enabled: boolean }>
}
