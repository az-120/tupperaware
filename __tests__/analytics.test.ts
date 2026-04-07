import {
  computeSummary,
  computeCategoryWaste,
  computeLocationWaste,
  computeMonthlyTrend,
} from "../lib/analytics";
import { Item, Location } from "../types";

const base: Omit<Item, "status" | "category" | "location_id" | "updated_at" | "partially_used"> = {
  id: "1",
  name: "Milk",
  quantity: "1 gal",
  expiry_date: "2026-04-10",
  barcode: null,
  added_by: "user-1",
  created_at: "2026-03-01T00:00:00Z",
};

function makeItem(
  overrides: Partial<Item> & Pick<Item, "status">,
): Item {
  return {
    ...base,
    id: Math.random().toString(),
    location_id: "loc-1",
    category: "Dairy",
    updated_at: "2026-04-01T00:00:00Z",
    partially_used: false,
    ...overrides,
  };
}

const loc1: Location = { id: "loc-1", household_id: "hh-1", name: "Fridge", icon: "🧊", created_at: "2026-01-01T00:00:00Z" };
const loc2: Location = { id: "loc-2", household_id: "hh-1", name: "Pantry", icon: "🥫", created_at: "2026-01-01T00:00:00Z" };

// ── computeSummary ─────────────────────────────────────────────────────────

describe("computeSummary", () => {
  it("returns all zeros for empty array", () => {
    const s = computeSummary([]);
    expect(s.totalConsumed).toBe(0);
    expect(s.totalUsed).toBe(0);
    expect(s.totalDiscarded).toBe(0);
    expect(s.wasteRate).toBe(0);
    expect(s.activeItems).toBe(0);
    expect(s.partialItems).toBe(0);
  });

  it("correctly counts used vs discarded", () => {
    const items = [
      makeItem({ status: "used" }),
      makeItem({ status: "used" }),
      makeItem({ status: "discarded" }),
      makeItem({ status: "active" }),
    ];
    const s = computeSummary(items);
    expect(s.totalUsed).toBe(2);
    expect(s.totalDiscarded).toBe(1);
    expect(s.totalConsumed).toBe(3);
    expect(s.activeItems).toBe(1);
  });

  it("computes waste rate correctly (3 discarded, 7 used = 30%)", () => {
    const items = [
      ...Array(7).fill(null).map(() => makeItem({ status: "used" })),
      ...Array(3).fill(null).map(() => makeItem({ status: "discarded" })),
    ];
    const s = computeSummary(items);
    expect(s.wasteRate).toBeCloseTo(30, 5);
  });

  it("returns 0 waste rate when totalConsumed is 0 (no division by zero)", () => {
    const items = [makeItem({ status: "active" })];
    const s = computeSummary(items);
    expect(s.wasteRate).toBe(0);
  });

  it("counts partially_used items correctly", () => {
    const items = [
      makeItem({ status: "active", partially_used: true }),
      makeItem({ status: "active", partially_used: true }),
      makeItem({ status: "active", partially_used: false }),
    ];
    const s = computeSummary(items);
    expect(s.partialItems).toBe(2);
  });
});

// ── computeCategoryWaste ───────────────────────────────────────────────────

describe("computeCategoryWaste", () => {
  it("groups items by category correctly", () => {
    const items = [
      makeItem({ status: "used", category: "Dairy" }),
      makeItem({ status: "discarded", category: "Dairy" }),
      makeItem({ status: "discarded", category: "Produce" }),
    ];
    const result = computeCategoryWaste(items);
    expect(result).toHaveLength(2);
    const dairy = result.find((r) => r.category === "Dairy")!;
    expect(dairy.used).toBe(1);
    expect(dairy.discarded).toBe(1);
  });

  it("sorts by discarded count descending", () => {
    const items = [
      makeItem({ status: "discarded", category: "Produce" }),
      makeItem({ status: "discarded", category: "Meat" }),
      makeItem({ status: "discarded", category: "Meat" }),
      makeItem({ status: "used", category: "Dairy" }),
    ];
    const result = computeCategoryWaste(items);
    expect(result[0].category).toBe("Meat");
    expect(result[0].discarded).toBe(2);
  });

  it("excludes categories with no consumed items (active only)", () => {
    const items = [
      makeItem({ status: "active", category: "Dairy" }),
      makeItem({ status: "used", category: "Produce" }),
    ];
    const result = computeCategoryWaste(items);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Produce");
  });

  it("handles single category correctly", () => {
    const items = [
      makeItem({ status: "used", category: "Frozen" }),
      makeItem({ status: "used", category: "Frozen" }),
      makeItem({ status: "discarded", category: "Frozen" }),
    ];
    const result = computeCategoryWaste(items);
    expect(result).toHaveLength(1);
    expect(result[0].wasteRate).toBeCloseTo(33.33, 1);
  });

  it("assigns correct emoji for each category", () => {
    const items = [makeItem({ status: "discarded", category: "Meat" })];
    const result = computeCategoryWaste(items);
    expect(result[0].emoji).toBe("🥩");
  });
});

// ── computeLocationWaste ───────────────────────────────────────────────────

describe("computeLocationWaste", () => {
  it("groups by location_id correctly", () => {
    const items = [
      makeItem({ status: "used", location_id: "loc-1" }),
      makeItem({ status: "discarded", location_id: "loc-1" }),
      makeItem({ status: "discarded", location_id: "loc-2" }),
    ];
    const result = computeLocationWaste(items, [loc1, loc2]);
    expect(result).toHaveLength(2);
    const fridge = result.find((r) => r.locationId === "loc-1")!;
    expect(fridge.used).toBe(1);
    expect(fridge.discarded).toBe(1);
  });

  it("matches location name and icon from locations array", () => {
    const items = [makeItem({ status: "discarded", location_id: "loc-2" })];
    const result = computeLocationWaste(items, [loc1, loc2]);
    expect(result[0].locationName).toBe("Pantry");
    expect(result[0].locationIcon).toBe("🥫");
  });

  it("sorts by discarded count descending", () => {
    const items = [
      makeItem({ status: "discarded", location_id: "loc-1" }),
      makeItem({ status: "discarded", location_id: "loc-2" }),
      makeItem({ status: "discarded", location_id: "loc-2" }),
    ];
    const result = computeLocationWaste(items, [loc1, loc2]);
    expect(result[0].locationId).toBe("loc-2");
    expect(result[0].discarded).toBe(2);
  });

  it("uses fallback name/icon when location not found", () => {
    const items = [makeItem({ status: "discarded", location_id: "loc-unknown" })];
    const result = computeLocationWaste(items, []);
    expect(result[0].locationName).toBe("Unknown");
    expect(result[0].locationIcon).toBe("📍");
  });
});

// ── computeMonthlyTrend ────────────────────────────────────────────────────

describe("computeMonthlyTrend", () => {
  it("returns exactly 6 months", () => {
    const result = computeMonthlyTrend([]);
    expect(result).toHaveLength(6);
  });

  it("months with no activity have 0 values", () => {
    const result = computeMonthlyTrend([]);
    for (const m of result) {
      expect(m.used).toBe(0);
      expect(m.discarded).toBe(0);
      expect(m.wasteRate).toBe(0);
    }
  });

  it("sorted chronologically oldest to newest", () => {
    const result = computeMonthlyTrend([]);
    // Earlier months should appear before later months
    const dates = result.map((m) => new Date(m.month));
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
    }
  });

  it("correctly parses updated_at dates and assigns to correct month", () => {
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15T10:00:00Z`;
    const items = [
      makeItem({ status: "used", updated_at: thisMonthStr }),
      makeItem({ status: "discarded", updated_at: thisMonthStr }),
    ];
    const result = computeMonthlyTrend(items);
    const thisMonth = result[result.length - 1];
    expect(thisMonth.used).toBe(1);
    expect(thisMonth.discarded).toBe(1);
    expect(thisMonth.wasteRate).toBe(50);
  });

  it("ignores items updated outside the 6-month window", () => {
    const items = [
      makeItem({ status: "discarded", updated_at: "2020-01-01T00:00:00Z" }),
    ];
    const result = computeMonthlyTrend(items);
    const total = result.reduce((sum, m) => sum + m.discarded, 0);
    expect(total).toBe(0);
  });
});
