export type ExpiryStatus = "expired" | "critical" | "warning" | "fresh";

export type ItemCategory =
  | "Dairy"
  | "Produce"
  | "Meat"
  | "Frozen"
  | "Pantry"
  | "Other";

export type ItemStatus = "active" | "used" | "discarded";

export type HouseholdRole = "owner" | "member";

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface Location {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface Item {
  id: string;
  location_id: string;
  name: string;
  category: ItemCategory;
  quantity: string;
  expiry_date: string;
  barcode: string | null;
  emoji?: string;
  status: ItemStatus;
  added_by: string;
  created_at: string;
  updated_at: string;
}
