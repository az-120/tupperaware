import { render, fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import AddItemScreen from "../app/item/add";
import { AuthContext } from "../hooks/useAuth";
import { HouseholdContext } from "../hooks/useHousehold";
import type { Session, User } from "@supabase/supabase-js";

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

jest.mock("../lib/notifications", () => ({
  scheduleExpiryNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../components/BarcodeScanner", () => ({
  BarcodeScanner: () => null,
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ value, onChange }: { value: Date; onChange: (e: unknown, d?: Date) => void }) =>
      React.createElement("View", { testID: "date-picker" }),
  };
});

const mockFetch = global.fetch as jest.Mock;

const fakeUser = { id: "user-1", email: "test@example.com" } as unknown as User;
const fakeSession = { user: fakeUser, access_token: "token" } as unknown as Session;
const fakeLocations = [
  { id: "loc-1", household_id: "hh-1", name: "Fridge", icon: "🧊", created_at: "2026-01-01T00:00:00Z" },
];
const fakeHousehold = { id: "hh-1", name: "The Zhaos", created_at: "2026-01-01T00:00:00Z" };

function renderAddScreen() {
  return render(
    React.createElement(
      AuthContext.Provider,
      {
        value: {
          session: fakeSession,
          user: fakeUser,
          loading: false,
          signOut: jest.fn(),
        },
      },
      React.createElement(
        HouseholdContext.Provider,
        {
          value: {
            household: fakeHousehold,
            locations: fakeLocations,
            loading: false,
            error: null,
            refresh: jest.fn(),
          },
        },
        React.createElement(AddItemScreen),
      ),
    ),
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

it("renders the Add Item screen in manual mode when location_id param exists", () => {
  const { getByText } = renderAddScreen();
  expect(getByText("Add Item")).toBeTruthy();
  expect(getByText("Manual")).toBeTruthy();
});

it("shows item name field in manual mode", () => {
  const { getByText, getByPlaceholderText } = renderAddScreen();
  fireEvent.press(getByText("Manual"));
  expect(getByPlaceholderText("e.g. Whole Milk")).toBeTruthy();
});

it("shows location pill for each household location", () => {
  const { getByText } = renderAddScreen();
  fireEvent.press(getByText("Manual"));
  expect(getByText("🧊 Fridge")).toBeTruthy();
});

it("shows validation error when submitting with empty name", async () => {
  const { getByText } = renderAddScreen();

  // Switch to manual mode first (starts in scan mode by default without location_id param)
  fireEvent.press(getByText("Manual"));

  fireEvent.press(getByText("Add item"));

  await waitFor(() => {
    expect(getByText("Item name is required.")).toBeTruthy();
  });
});

it("shows error when no location is selected", async () => {
  const { getByText, getByPlaceholderText } = renderAddScreen();

  fireEvent.press(getByText("Manual"));

  fireEvent.changeText(getByPlaceholderText("e.g. Whole Milk"), "Milk");

  fireEvent.press(getByText("Add item"));

  await waitFor(() => {
    expect(getByText("Please select a location.")).toBeTruthy();
  });
});

it("submits successfully and calls router.back on success", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      {
        id: "new-item",
        location_id: "loc-1",
        name: "Milk",
        category: "Dairy",
        quantity: "",
        expiry_date: "2026-05-01",
        status: "active",
        added_by: "user-1",
        created_at: "2026-04-06T00:00:00Z",
        updated_at: "2026-04-06T00:00:00Z",
        barcode: null,
      },
    ],
  });

  const { getByText, getByPlaceholderText } = renderAddScreen();

  fireEvent.press(getByText("Manual"));

  fireEvent.changeText(getByPlaceholderText("e.g. Whole Milk"), "Milk");
  fireEvent.press(getByText("🧊 Fridge"));
  fireEvent.press(getByText("Add item"));

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/items"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
