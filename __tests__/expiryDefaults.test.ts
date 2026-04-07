import { getExpiryDays, getSuggestedExpiryDate, normalizeDate } from "../lib/expiryDefaults";

// ── getExpiryDays ─────────────────────────────────────────────────────────────

describe("getExpiryDays", () => {
  it("returns correct days for exact match (milk → 7)", () => {
    expect(getExpiryDays("milk", "Dairy")).toBe(7);
  });

  it("is case-insensitive for exact match", () => {
    expect(getExpiryDays("Milk", "Dairy")).toBe(7);
    expect(getExpiryDays("MILK", "Dairy")).toBe(7);
  });

  it("returns correct days for multi-word exact match (whole milk → 7)", () => {
    expect(getExpiryDays("whole milk", "Dairy")).toBe(7);
  });

  it("matches via substring (contains 'chicken' → 3)", () => {
    expect(getExpiryDays("grilled chicken breast", "Meat")).toBe(3);
  });

  it("falls back to category default for unknown Dairy item", () => {
    expect(getExpiryDays("unknown dairy thing", "Dairy")).toBe(7);
  });

  it("falls back to category default for unknown Produce item", () => {
    expect(getExpiryDays("unknown produce thing", "Produce")).toBe(5);
  });

  it("falls back to category default for unknown Meat item", () => {
    expect(getExpiryDays("mystery meat", "Meat")).toBe(3);
  });

  it("falls back to category default for Frozen", () => {
    expect(getExpiryDays("some frozen dish", "Frozen")).toBe(90);
  });

  it("falls back to category default for Pantry", () => {
    expect(getExpiryDays("unknown pantry item", "Pantry")).toBe(180);
  });

  it("falls back to Other category default", () => {
    expect(getExpiryDays("mystery item", "Other")).toBe(7);
  });

  it("returns correct days for eggs", () => {
    expect(getExpiryDays("eggs", "Dairy")).toBe(21);
  });

  it("returns correct days for banana", () => {
    expect(getExpiryDays("banana", "Produce")).toBe(5);
  });
});

// ── getSuggestedExpiryDate ────────────────────────────────────────────────────

describe("getSuggestedExpiryDate", () => {
  it("returns a Date in the future", () => {
    const result = getSuggestedExpiryDate("milk", "Dairy");
    expect(result > new Date()).toBe(true);
  });

  it("is approximately N days from now for a known item", () => {
    const now = new Date();
    const result = getSuggestedExpiryDate("milk", "Dairy"); // 7 days
    const diffDays = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it("uses category fallback when item is unknown", () => {
    const now = new Date();
    const result = getSuggestedExpiryDate("mystery item", "Frozen"); // 90 days
    const diffDays = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it("returns a Date object", () => {
    const result = getSuggestedExpiryDate("bread", "Pantry");
    expect(result).toBeInstanceOf(Date);
  });

  it("different items produce different dates", () => {
    const milkDate = getSuggestedExpiryDate("milk", "Dairy");   // 7 days
    const pastaDate = getSuggestedExpiryDate("pasta", "Pantry"); // 365 days
    expect(pastaDate.getTime()).toBeGreaterThan(milkDate.getTime());
  });

  it("normalizes suggested date to noon (hours === 12)", () => {
    const result = getSuggestedExpiryDate("milk", "Dairy");
    expect(result.getHours()).toBe(12);
  });

  it("returns correct days for eggs (21)", () => {
    const now = new Date();
    const result = getSuggestedExpiryDate("eggs", "Dairy");
    const diffDays = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(21);
  });

  it("falls back to category default for unknown item name", () => {
    const now = new Date();
    const result = getSuggestedExpiryDate("mystery food xyz", "Meat"); // Meat default = 3
    const diffDays = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(3);
  });
});

// ── normalizeDate ─────────────────────────────────────────────────────────────

describe("normalizeDate", () => {
  it("sets hours to 12 when given a Date object", () => {
    const input = new Date(2026, 3, 10, 8, 30, 0); // April 10 at 08:30
    const result = normalizeDate(input);
    expect(result.getHours()).toBe(12);
    expect(result.getDate()).toBe(10);
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2026);
  });

  it("does not change the calendar date when given a Date already at noon", () => {
    const input = new Date(2026, 3, 10, 12, 0, 0);
    const result = normalizeDate(input);
    expect(result.getHours()).toBe(12);
    expect(result.getDate()).toBe(10);
  });

  it("parses YYYY-MM-DD string and sets hours to 12", () => {
    const result = normalizeDate("2026-04-10");
    expect(result.getHours()).toBe(12);
    expect(result.getDate()).toBe(10);
    expect(result.getMonth()).toBe(3); // April = month 3
    expect(result.getFullYear()).toBe(2026);
  });
});

// ── range checks ──────────────────────────────────────────────────────────────

describe("range checks", () => {
  it("getExpiryDays always returns a positive number", () => {
    const cases: Array<[string, string]> = [
      ["milk", "Dairy"],
      ["eggs", "Dairy"],
      ["spinach", "Produce"],
      ["chicken", "Meat"],
      ["pasta", "Pantry"],
      ["mystery item", "Other"],
      ["totally unknown xyz", "Frozen"],
    ];
    for (const [name, category] of cases) {
      expect(getExpiryDays(name, category)).toBeGreaterThan(0);
    }
  });

  it("getExpiryDays never returns 0 or negative", () => {
    expect(getExpiryDays("", "Other")).toBeGreaterThan(0);
    expect(getExpiryDays("   ", "Dairy")).toBeGreaterThan(0);
  });

  it("getSuggestedExpiryDate always returns a future date", () => {
    const now = new Date();
    const cases: Array<[string, string]> = [
      ["milk", "Dairy"],
      ["eggs", "Dairy"],
      ["chicken", "Meat"],
      ["mystery item", "Other"],
    ];
    for (const [name, category] of cases) {
      expect(getSuggestedExpiryDate(name, category).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("normalizeDate always sets hours to 12", () => {
    const dates = [
      new Date(2026, 0, 1, 0, 0, 0),   // midnight
      new Date(2026, 0, 1, 23, 59, 59), // end of day
      new Date(2026, 5, 15, 6, 30, 0),  // morning
    ];
    for (const d of dates) {
      expect(normalizeDate(d).getHours()).toBe(12);
    }
  });

  it("known answer: eggs → exactly 21 days", () => {
    expect(getExpiryDays("eggs", "Dairy")).toBe(21);
  });

  it("known answer: milk → exactly 7 days", () => {
    expect(getExpiryDays("milk", "Dairy")).toBe(7);
  });

  it("known answer: unknown item with Dairy category → 7 days fallback", () => {
    expect(getExpiryDays("completely unknown dairy food xzyz", "Dairy")).toBe(7);
  });
});
