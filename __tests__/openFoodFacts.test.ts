import { lookupBarcode } from "../lib/openFoodFacts";

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => {
  mockFetch.mockReset();
});

function mockResponse(body: object, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: async () => body,
  });
}

// ── lookupBarcode ─────────────────────────────────────────────────────────────

describe("lookupBarcode", () => {
  it("returns name and category when product is found", async () => {
    mockResponse({
      status: 1,
      product: {
        product_name: "Whole Milk",
        categories_tags: ["en:dairy"],
      },
    });

    const result = await lookupBarcode("012345678901");
    expect(result).toEqual({ name: "Whole Milk", category: "Dairy" });
  });

  it("returns null when status is 0 (product not found)", async () => {
    mockResponse({ status: 0, product: null });

    const result = await lookupBarcode("000000000000");
    expect(result).toBeNull();
  });

  it("returns null when product has no name", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "", categories_tags: ["en:dairy"] },
    });

    const result = await lookupBarcode("012345678901");
    expect(result).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    mockResponse({}, false);

    const result = await lookupBarcode("012345678901");
    expect(result).toBeNull();
  });

  it("returns null on network error (fetch throws)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await lookupBarcode("012345678901");
    expect(result).toBeNull();
  });

  it("maps dairy category tag correctly", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Cheese", categories_tags: ["en:dairies"] },
    });

    const result = await lookupBarcode("111");
    expect(result?.category).toBe("Dairy");
  });

  it("maps produce category tag correctly", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Apple Juice", categories_tags: ["en:fruits"] },
    });

    const result = await lookupBarcode("222");
    expect(result?.category).toBe("Produce");
  });

  it("maps frozen category tag correctly", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Frozen Peas", categories_tags: ["en:frozen-foods"] },
    });

    const result = await lookupBarcode("333");
    expect(result?.category).toBe("Frozen");
  });

  it("maps meat category tag correctly", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Beef Jerky", categories_tags: ["en:meats"] },
    });

    const result = await lookupBarcode("444");
    expect(result?.category).toBe("Meat");
  });

  it("falls back to Other for unknown category tags", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Mystery Food", categories_tags: ["en:unknown-category"] },
    });

    const result = await lookupBarcode("555");
    expect(result?.category).toBe("Other");
  });

  it("falls back to Other when categories_tags is missing", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "Mystery Food" },
    });

    const result = await lookupBarcode("666");
    expect(result?.category).toBe("Other");
  });

  it("trims whitespace from product name", async () => {
    mockResponse({
      status: 1,
      product: { product_name: "  Whole Milk  ", categories_tags: ["en:dairy"] },
    });

    const result = await lookupBarcode("012345678901");
    expect(result?.name).toBe("Whole Milk");
  });
});
