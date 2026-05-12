export type PricingSetStatus = 'draft' | 'active' | 'archived'
export type AbTestStatus     = 'draft' | 'active' | 'ended'

export interface PricingSet {
  id: string
  name: string
  description: string | null
  status: PricingSetStatus
  active_from: string
  active_to: string | null
  created_at: string
  updated_at: string
}

export interface PricingSetPackage {
  id: string
  set_id: string
  package_id: string
  display_order: number
}

export interface PricingSetDetail extends PricingSet {
  packages: PricingSetPackage[]
}

export interface PricingSetListItem extends PricingSet {
  package_count: number
  is_live: boolean
}

export interface AbTest {
  id: string
  name: string
  set_a_id: string
  set_b_id: string
  traffic_split_a: number
  status: AbTestStatus
  active_from: string
  active_to: string | null
  created_at: string
  updated_at: string
}

export interface AbTestWithSets extends AbTest {
  set_a: PricingSet
  set_b: PricingSet
  is_live: boolean
}

export interface SavePricingSetPayload {
  id: string | null
  name: string
  description: string | null
  status: PricingSetStatus
  active_from: string
  active_to: string | null
  packages: Array<{ package_id: string; display_order: number }>
}

export interface SaveAbTestPayload {
  id: string | null
  name: string
  set_a_id: string
  set_b_id: string
  traffic_split_a: number
  status: AbTestStatus
  active_from: string
  active_to: string | null
}
