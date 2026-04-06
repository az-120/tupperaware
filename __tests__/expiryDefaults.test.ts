import { getExpiryDays, getSuggestedExpiryDate } from "../lib/expiryDefaults";

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
});
