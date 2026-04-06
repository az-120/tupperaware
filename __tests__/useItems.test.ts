import { renderHook, waitFor } from "@testing-library/react-native";
import { useItems } from "../hooks/useItems";

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

const sampleItems = [
  {
    id: "item-1",
    location_id: "loc-1",
    name: "Milk",
    category: "Dairy",
    quantity: "1 gal",
    expiry_date: "2026-04-10",
    status: "active",
    added_by: "user-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    barcode: null,
  },
];

it("returns items on success", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => sampleItems,
  });

  const { result } = renderHook(() => useItems("loc-1"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.items).toEqual(sampleItems);
  expect(result.current.error).toBeNull();
});

it("starts with loading=true", () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [],
  });

  const { result } = renderHook(() => useItems("loc-1"));
  expect(result.current.loading).toBe(true);
});

it("sets error on non-ok response", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

  const { result } = renderHook(() => useItems("loc-1"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe("Failed to fetch items (403)");
  expect(result.current.items).toEqual([]);
});

it("calls fetch with correct URL and headers", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderHook(() => useItems("loc-42"));

  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("location_id=eq.loc-42"),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "test-anon-key",
          Authorization: "Bearer test-token",
        }),
      }),
    ),
  );
});

it("refresh re-fetches items", async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => sampleItems });

  const { result } = renderHook(() => useItems("loc-1"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.items).toEqual([]);

  await result.current.refresh();
  await waitFor(() => expect(result.current.items).toEqual(sampleItems));
});

it("returns empty array when location has no items", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  const { result } = renderHook(() => useItems("loc-empty"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.items).toEqual([]);
  expect(result.current.error).toBeNull();
});
