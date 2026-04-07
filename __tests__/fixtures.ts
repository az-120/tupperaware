import {Item, Location, Household} from "../types";

export const mockHousehold: Household = {
  id: "hh-1",
  name: "Test Household",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockLocations: Location[] = [
  {
    id: "loc-1",
    name: "Fridge",
    icon: "🧊",
    household_id: "hh-1",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "loc-2",
    name: "Pantry",
    icon: "🥫",
    household_id: "hh-1",
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockItems: Item[] = [
  {
    id: "1",
    name: "Whole Milk",
    category: "Dairy",
    status: "used",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🥛",
    expiry_date: "2026-04-10",
    quantity: "1 gal",
    barcode: null,
    updated_at: "2026-03-01T12:00:00Z",
    created_at: "2026-02-20T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "2",
    name: "Spinach",
    category: "Produce",
    status: "discarded",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🥦",
    expiry_date: "2026-03-28",
    quantity: "1 bag",
    barcode: null,
    updated_at: "2026-03-05T12:00:00Z",
    created_at: "2026-02-25T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "3",
    name: "Chicken Breast",
    category: "Meat",
    status: "discarded",
    partially_used: false,
    location_id: "loc-2",
    emoji: "🥩",
    expiry_date: "2026-03-30",
    quantity: "2 lbs",
    barcode: null,
    updated_at: "2026-03-10T12:00:00Z",
    created_at: "2026-03-08T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "4",
    name: "Eggs",
    category: "Dairy",
    status: "active",
    partially_used: true,
    location_id: "loc-1",
    emoji: "🥚",
    expiry_date: "2026-04-20",
    quantity: "12 ct",
    barcode: null,
    updated_at: "2026-03-15T12:00:00Z",
    created_at: "2026-03-01T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "5",
    name: "Rice",
    category: "Pantry",
    status: "used",
    partially_used: false,
    location_id: "loc-2",
    emoji: "🥫",
    expiry_date: "2026-12-01",
    quantity: "5 lbs",
    barcode: null,
    updated_at: "2026-03-20T12:00:00Z",
    created_at: "2026-03-10T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "6",
    name: "Greek Yogurt",
    category: "Dairy",
    status: "active",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🫙",
    expiry_date: "2026-04-14",
    quantity: "32oz",
    barcode: null,
    updated_at: "2026-03-20T12:00:00Z",
    created_at: "2026-03-15T12:00:00Z",
    added_by: "user-1",
  },
];

// Known expected outputs — pre-computed by hand for verification
export const expectedSummary = {
  totalConsumed: 4, // milk(used) + spinach(discarded) + chicken(discarded) + rice(used)
  totalUsed: 2,     // milk, rice
  totalDiscarded: 2, // spinach, chicken
  wasteRate: 50,    // 2 discarded / 4 consumed * 100
  activeItems: 2,   // eggs, yogurt
  partialItems: 1,  // eggs
};

// Entries per category (order matches computeCategoryWaste sort: discarded DESC)
// Produce(1), Meat(1), Dairy(0), Pantry(0)
export const expectedCategoryWaste = [
  {category: "Produce", discarded: 1, used: 0, wasteRate: 100},
  {category: "Meat", discarded: 1, used: 0, wasteRate: 100},
  {category: "Dairy", discarded: 0, used: 1, wasteRate: 0},
  {category: "Pantry", discarded: 0, used: 1, wasteRate: 0},
];
