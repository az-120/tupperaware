import { renderHook, waitFor } from "@testing-library/react-native";
import { useLocations } from "../hooks/useLocations";

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

const sampleLocations = [
  { id: "loc-1", household_id: "hh-1", name: "Fridge", icon: "🧊", created_at: "2026-01-01T00:00:00Z" },
  { id: "loc-2", household_id: "hh-1", name: "Pantry", icon: "🥫", created_at: "2026-01-01T00:00:00Z" },
];

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

it("returns empty array and loading=false when householdId is null", async () => {
  const { result } = renderHook(() => useLocations(null));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.locations).toEqual([]);
  expect(result.current.error).toBeNull();
});

it("fetches locations with their items", async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => sampleLocations })
    .mockResolvedValueOnce({ ok: true, json: async () => sampleItems })
    .mockResolvedValueOnce({ ok: true, json: async () => [] });

  const { result } = renderHook(() => useLocations("hh-1"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.locations).toHaveLength(2);
  expect(result.current.locations[0].items).toEqual(sampleItems);
  expect(result.current.locations[1].items).toEqual([]);
});

it("sets error on failed locations fetch", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

  const { result } = renderHook(() => useLocations("hh-1"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe("Failed to fetch locations (500)");
  expect(result.current.locations).toEqual([]);
});

it("returns empty items array when items fetch fails", async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => sampleLocations })
    .mockResolvedValueOnce({ ok: false, status: 403 })
    .mockResolvedValueOnce({ ok: false, status: 403 });

  const { result } = renderHook(() => useLocations("hh-1"));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.locations[0].items).toEqual([]);
  expect(result.current.locations[1].items).toEqual([]);
});

it("refresh re-fetches locations", async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => sampleLocations })
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => [] });

  const { result } = renderHook(() => useLocations("hh-1"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.locations).toEqual([]);

  await result.current.refresh();
  await waitFor(() => expect(result.current.locations).toHaveLength(2));
});

it("calls fetch with correct household_id in URL", async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderHook(() => useLocations("hh-99"));

  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("household_id=eq.hh-99"),
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: "test-anon-key" }),
      }),
    ),
  );
});
