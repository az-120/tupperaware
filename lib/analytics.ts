import { Item, ItemCategory, Location } from "../types";

export interface AnalyticsSummary {
  totalConsumed: number;
  totalUsed: number;
  totalDiscarded: number;
  wasteRate: number;
  activeItems: number;
  partialItems: number;
}

export interface CategoryWaste {
  category: string;
  emoji: string;
  discarded: number;
  used: number;
  wasteRate: number;
}

export interface LocationWaste {
  locationId: string;
  locationName: string;
  locationIcon: string;
  discarded: number;
  used: number;
  wasteRate: number;
}

export interface MonthlyTrend {
  month: string;
  used: number;
  discarded: number;
  wasteRate: number;
}

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Dairy: "🥛",
  Produce: "🥦",
  Meat: "🥩",
  Frozen: "❄️",
  Pantry: "🥫",
  Other: "📦",
};

export function computeSummary(items: Item[]): AnalyticsSummary {
  let totalUsed = 0;
  let totalDiscarded = 0;
  let activeItems = 0;
  let partialItems = 0;

  for (const item of items) {
    if (item.status === "used") totalUsed++;
    else if (item.status === "discarded") totalDiscarded++;
    else if (item.status === "active") activeItems++;
    if (item.partially_used) partialItems++;
  }

  const totalConsumed = totalUsed + totalDiscarded;
  const wasteRate = totalConsumed === 0 ? 0 : (totalDiscarded / totalConsumed) * 100;

  if (__DEV__) {
    console.log("[analytics] input:", items.length, "items");
    console.log(
      "[analytics] used:",
      totalUsed,
      "discarded:",
      totalDiscarded,
      "waste rate:",
      wasteRate.toFixed(1) + "%",
    );
  }

  return { totalConsumed, totalUsed, totalDiscarded, wasteRate, activeItems, partialItems };
}

export function computeCategoryWaste(items: Item[]): CategoryWaste[] {
  const map = new Map<string, { used: number; discarded: number }>();

  for (const item of items) {
    if (item.status !== "used" && item.status !== "discarded") continue;
    const entry = map.get(item.category) ?? { used: 0, discarded: 0 };
    if (item.status === "used") entry.used++;
    else entry.discarded++;
    map.set(item.category, entry);
  }

  const categoryWaste = Array.from(map.entries())
    .map(([category, { used, discarded }]) => {
      const consumed = used + discarded;
      return {
        category,
        emoji: CATEGORY_EMOJI[category as ItemCategory] ?? "📦",
        discarded,
        used,
        wasteRate: consumed === 0 ? 0 : (discarded / consumed) * 100,
      };
    })
    .sort((a, b) => b.discarded - a.discarded);

  if (__DEV__) {
    console.log(
      "[analytics] category breakdown:",
      categoryWaste.map((c) => `${c.category}:${c.wasteRate}%`),
    );
  }

  return categoryWaste;
}

export function computeLocationWaste(items: Item[], locations: Location[]): LocationWaste[] {
  const locationMap = new Map<string, Location>();
  for (const loc of locations) locationMap.set(loc.id, loc);

  const map = new Map<string, { used: number; discarded: number }>();

  for (const item of items) {
    if (item.status !== "used" && item.status !== "discarded") continue;
    const entry = map.get(item.location_id) ?? { used: 0, discarded: 0 };
    if (item.status === "used") entry.used++;
    else entry.discarded++;
    map.set(item.location_id, entry);
  }

  return Array.from(map.entries())
    .map(([locationId, { used, discarded }]) => {
      const loc = locationMap.get(locationId);
      const consumed = used + discarded;
      return {
        locationId,
        locationName: loc?.name ?? "Unknown",
        locationIcon: loc?.icon ?? "📍",
        discarded,
        used,
        wasteRate: consumed === 0 ? 0 : (discarded / consumed) * 100,
      };
    })
    .sort((a, b) => b.discarded - a.discarded);
}

export function computeMonthlyTrend(items: Item[]): MonthlyTrend[] {
  // Build the last 6 calendar months (oldest first)
  const now = new Date();
  const months: MonthlyTrend[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      used: 0,
      discarded: 0,
      wasteRate: 0,
    });
  }

  for (const item of items) {
    if (item.status !== "used" && item.status !== "discarded") continue;
    const updated = new Date(item.updated_at);
    const label = updated.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const slot = months.find((m) => m.month === label);
    if (!slot) continue;
    if (item.status === "used") slot.used++;
    else slot.discarded++;
  }

  for (const slot of months) {
    const consumed = slot.used + slot.discarded;
    slot.wasteRate = consumed === 0 ? 0 : (slot.discarded / consumed) * 100;
  }

  return months;
}
