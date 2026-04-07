import { fetchRecipeSuggestions, fetchRecipesForSelectedItems, Recipe } from "../lib/anthropic";
import { Item } from "../types";
import { mockItems } from "./fixtures";

const mockFetch = global.fetch as jest.Mock;

// makeItem used for date-specific test scenarios
const makeItem = (name: string, expiryDate: string): Item => ({
  id: `id-${name}`,
  location_id: "loc-1",
  name,
  category: "Other",
  quantity: "1",
  expiry_date: expiryDate,
  barcode: null,
  status: "active",
  added_by: "user-1",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
});

// Use active items from fixture as a convenience reference
const activeFixtureItems = mockItems.filter((i) => i.status === "active");

const sampleRecipes: Recipe[] = [
  {
    name: "Quick Stir Fry",
    emoji: "🥘",
    usesItems: ["chicken", "broccoli"],
    urgentItems: ["chicken"],
    description: "A quick stir fry using expiring chicken. Ready in minutes.",
    cookTime: "15 min",
    difficulty: "Easy",
  },
];

beforeEach(() => {
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = "test-api-key";
});

it("returns parsed Recipe array on success", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify(sampleRecipes) }],
    }),
  });

  const result = await fetchRecipeSuggestions(
    [makeItem("chicken", "2026-04-07")],
    [makeItem("broccoli", "2026-04-10")],
    [],
  );

  expect(result).toEqual(sampleRecipes);
  expect(result[0].name).toBe("Quick Stir Fry");
});

it("strips markdown fences from response", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: "```json\n" + JSON.stringify(sampleRecipes) + "\n```" }],
    }),
  });

  const result = await fetchRecipeSuggestions([], [], [makeItem("rice", "2026-05-01")]);
  expect(result).toEqual(sampleRecipes);
});

it("throws on malformed JSON response", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: "not valid json at all" }],
    }),
  });

  await expect(fetchRecipeSuggestions([], [], [])).rejects.toThrow("Failed to parse recipe response");
});

it("throws on network error", async () => {
  mockFetch.mockRejectedValueOnce(new Error("Network error"));

  await expect(fetchRecipeSuggestions([], [], [])).rejects.toThrow("Network error");
});

it("throws on API error status", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 429,
    text: async () => "Rate limited",
  });

  await expect(fetchRecipeSuggestions([], [], [])).rejects.toThrow("Anthropic API error (429)");
});

it("returns recipes for empty inventory", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: "[]" }],
    }),
  });

  const result = await fetchRecipeSuggestions([], [], []);
  expect(result).toEqual([]);
});

it("sends correct headers including model", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify(sampleRecipes) }],
    }),
  });

  await fetchRecipeSuggestions([], [], []);

  expect(mockFetch).toHaveBeenCalledWith(
    "https://api.anthropic.com/v1/messages",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "x-api-key": "test-api-key",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      }),
    }),
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
  expect(body.model).toBe("claude-sonnet-4-20250514");
  expect(body.max_tokens).toBe(1024);
});

it("throws when response content is empty", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: [] }),
  });

  await expect(fetchRecipeSuggestions([], [], [])).rejects.toThrow("Empty response from Anthropic API");
});

// ── fetchRecipesForSelectedItems ────────────────────────────────────────────

describe("fetchRecipesForSelectedItems", () => {
  it("returns parsed Recipe array on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(sampleRecipes) }],
      }),
    });

    const result = await fetchRecipesForSelectedItems([
      makeItem("chicken", "2026-04-08"),
      makeItem("rice", "2026-04-15"),
    ]);

    expect(result).toEqual(sampleRecipes);
  });

  it("includes selected item names in prompt", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(sampleRecipes) }],
      }),
    });

    await fetchRecipesForSelectedItems([
      makeItem("chicken", "2026-04-08"),
      makeItem("broccoli", "2026-04-10"),
    ]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain("chicken");
    expect(prompt).toContain("broccoli");
    expect(prompt).toContain("expires in");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Server error",
    });

    await expect(
      fetchRecipesForSelectedItems([makeItem("chicken", "2026-04-08")]),
    ).rejects.toThrow("Anthropic API error (500)");
  });

  it("sends correct model and headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "[]" }],
      }),
    });

    await fetchRecipesForSelectedItems([makeItem("eggs", "2026-04-09")]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-api-key",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.model).toBe("claude-sonnet-4-20250514");
  });
});
