import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { useHouseholdProvider, HouseholdContext } from "../hooks/useHousehold";
import { AuthContext } from "../hooks/useAuth";
import type { Session } from "@supabase/supabase-js";

// Build chainable mock for supabase JS client
const makeChain = (result: { data: unknown; error: unknown }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: undefined as unknown,
  };
  return chain;
};

const mockMaybeSingle = jest.fn();
const mockLocationsEq = jest.fn();
const mockLocationsSelect = jest.fn();
const mockMembersEq = jest.fn();
const mockMembersSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const fakeSession = {
  user: { id: "user-1" },
  access_token: "token",
} as unknown as Session;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    AuthContext.Provider,
    { value: { session: fakeSession, user: fakeSession.user as never, loading: false, signOut: jest.fn() } },
    children,
  );
}

function nullSessionWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    AuthContext.Provider,
    { value: { session: null, user: null, loading: false, signOut: jest.fn() } },
    children,
  );
}

const sampleHousehold = { id: "hh-1", name: "The Zhaos", created_at: "2026-01-01T00:00:00Z" };
const sampleLocations = [
  { id: "loc-1", household_id: "hh-1", name: "Fridge", icon: "🧊", created_at: "2026-01-01T00:00:00Z" },
];

beforeEach(() => {
  jest.clearAllMocks();

  mockFrom.mockImplementation((table: string) => {
    if (table === "household_members") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { household_id: "hh-1", households: sampleHousehold },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "locations") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: sampleLocations, error: null }),
        }),
      };
    }
    return {};
  });
});

it("returns null household/empty locations when session is null", async () => {
  const { result } = renderHook(() => useHouseholdProvider(), { wrapper: nullSessionWrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.household).toBeNull();
  expect(result.current.locations).toEqual([]);
});

it("fetches household and locations on valid session", async () => {
  const { result } = renderHook(() => useHouseholdProvider(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.household).toEqual(sampleHousehold);
  expect(result.current.locations).toEqual(sampleLocations);
  expect(result.current.error).toBeNull();
});

it("sets error when household_members query fails", async () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "household_members") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "permission denied" },
            }),
          }),
        }),
      };
    }
    return {};
  });

  const { result } = renderHook(() => useHouseholdProvider(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe("permission denied");
  expect(result.current.household).toBeNull();
});

it("sets household=null when member row is missing", async () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "household_members") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    return {};
  });

  const { result } = renderHook(() => useHouseholdProvider(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.household).toBeNull();
  expect(result.current.locations).toEqual([]);
});

it("sets error when locations query fails", async () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "household_members") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { household_id: "hh-1", households: sampleHousehold },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "locations") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: "locations error" } }),
        }),
      };
    }
    return {};
  });

  const { result } = renderHook(() => useHouseholdProvider(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe("locations error");
  expect(result.current.household).toEqual(sampleHousehold);
});

it("refresh re-fetches household", async () => {
  const { result } = renderHook(() => useHouseholdProvider(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.household).toEqual(sampleHousehold);

  await result.current.refresh();
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.household).toEqual(sampleHousehold);
  expect(mockFrom).toHaveBeenCalled();
});
