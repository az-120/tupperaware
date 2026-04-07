import {validateItems, validateLocations, validateHousehold, validateRecipes} from "../lib/validators";
import {mockItems, mockLocations, mockHousehold} from "./fixtures";
import {Recipe} from "../lib/anthropic";

// ── validateItems ─────────────────────────────────────────────────────────────

describe("validateItems", () => {
  it("returns valid for well-formed mockItems fixture", () => {
    const result = validateItems(mockItems);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns rowCount matching input array length", () => {
    const result = validateItems(mockItems);
    expect(result.rowCount).toBe(mockItems.length);
  });

  it("catches item missing required id field", () => {
    const badItems = [{...mockItems[0], id: undefined}];
    const result = validateItems(badItems);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("catches invalid status value", () => {
    const badItems = [{...mockItems[0], status: "eaten"}];
    const result = validateItems(badItems);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("catches invalid category value", () => {
    const badItems = [{...mockItems[0], category: "Snacks"}];
    const result = validateItems(badItems);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("category"))).toBe(true);
  });

  it("catches malformed expiry_date string", () => {
    const badItems = [{...mockItems[0], expiry_date: "April 10 2026"}];
    const result = validateItems(badItems);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("expiry_date"))).toBe(true);
  });

  it("handles empty array — valid with rowCount 0", () => {
    const result = validateItems([]);
    expect(result.valid).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("handles non-array input — returns invalid", () => {
    const result = validateItems({id: "1", name: "not an array"});
    expect(result.valid).toBe(false);
  });

  it("handles null input — returns invalid", () => {
    const result = validateItems(null);
    expect(result.valid).toBe(false);
  });

  it("collects all errors, not just first", () => {
    const badItems = [
      {name: "no-id", status: "eaten", category: "Snacks"},
    ];
    const result = validateItems(badItems);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ── validateLocations ─────────────────────────────────────────────────────────

describe("validateLocations", () => {
  it("returns valid for mockLocations fixture", () => {
    const result = validateLocations(mockLocations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rowCount).toBe(mockLocations.length);
  });

  it("catches missing household_id", () => {
    const bad = [{...mockLocations[0], household_id: undefined}];
    const result = validateLocations(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("household_id"))).toBe(true);
  });

  it("catches empty name string", () => {
    const bad = [{...mockLocations[0], name: ""}];
    const result = validateLocations(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("handles non-array input — returns invalid", () => {
    const result = validateLocations("not an array");
    expect(result.valid).toBe(false);
  });

  it("handles empty array — valid with rowCount 0", () => {
    const result = validateLocations([]);
    expect(result.valid).toBe(true);
    expect(result.rowCount).toBe(0);
  });
});

// ── validateHousehold ─────────────────────────────────────────────────────────

describe("validateHousehold", () => {
  it("returns valid for mockHousehold fixture", () => {
    const result = validateHousehold(mockHousehold);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches missing id", () => {
    const bad = {...mockHousehold, id: undefined};
    const result = validateHousehold(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("catches empty name string", () => {
    const bad = {...mockHousehold, name: ""};
    const result = validateHousehold(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("rejects array input", () => {
    const result = validateHousehold([mockHousehold]);
    expect(result.valid).toBe(false);
  });

  it("rejects null input", () => {
    const result = validateHousehold(null);
    expect(result.valid).toBe(false);
  });
});

// ── validateRecipes ───────────────────────────────────────────────────────────

describe("validateRecipes", () => {
  const sampleRecipes: Recipe[] = [
    {
      name: "Stir Fry",
      emoji: "🥘",
      usesItems: ["chicken", "broccoli"],
      urgentItems: ["chicken"],
      description: "A quick stir fry.",
      cookTime: "15 min",
      difficulty: "Easy",
    },
  ];

  it("returns valid for well-formed recipe array", () => {
    const result = validateRecipes(sampleRecipes);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rowCount).toBe(1);
  });

  it("catches more than 3 recipes", () => {
    const tooMany = [
      ...sampleRecipes,
      ...sampleRecipes,
      ...sampleRecipes,
      ...sampleRecipes,
    ];
    const result = validateRecipes(tooMany);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("3"))).toBe(true);
  });

  it("catches invalid difficulty value", () => {
    const bad = [{...sampleRecipes[0], difficulty: "Extreme"}];
    const result = validateRecipes(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("difficulty"))).toBe(true);
  });

  it("catches empty usesItems array", () => {
    const bad = [{...sampleRecipes[0], usesItems: []}];
    const result = validateRecipes(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("usesItems"))).toBe(true);
  });

  it("handles non-array input — returns invalid", () => {
    const result = validateRecipes("not an array");
    expect(result.valid).toBe(false);
  });

  it("handles empty array — valid with rowCount 0", () => {
    const result = validateRecipes([]);
    expect(result.valid).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("accepts exactly 3 recipes", () => {
    const three = [sampleRecipes[0], sampleRecipes[0], sampleRecipes[0]];
    const result = validateRecipes(three);
    expect(result.valid).toBe(true);
    expect(result.rowCount).toBe(3);
  });
});
