import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useAuthProvider } from "../hooks/useAuth";
import type { Session } from "@supabase/supabase-js";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

const fakeSession = {
  user: { id: "user-1", email: "test@example.com" },
  access_token: "token",
} as unknown as Session;

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
});

it("initializes with loading=true then resolves session", async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });

  const { result } = renderHook(() => useAuthProvider());

  expect(result.current.loading).toBe(true);

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.session).toEqual(fakeSession);
  expect(result.current.user).toEqual(fakeSession.user);
});

it("sets session=null when no session exists", async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });

  const { result } = renderHook(() => useAuthProvider());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.session).toBeNull();
  expect(result.current.user).toBeNull();
});

it("updates session when onAuthStateChange fires", async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });

  let authChangeCallback: (event: string, session: Session | null) => void = () => {};
  mockOnAuthStateChange.mockImplementation((cb: typeof authChangeCallback) => {
    authChangeCallback = cb;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });

  const { result } = renderHook(() => useAuthProvider());
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.session).toBeNull();

  act(() => {
    authChangeCallback("SIGNED_IN", fakeSession);
  });

  await waitFor(() => expect(result.current.session).toEqual(fakeSession));
});

it("signOut calls supabase.auth.signOut", async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });
  mockSignOut.mockResolvedValueOnce({});

  const { result } = renderHook(() => useAuthProvider());
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    await result.current.signOut();
  });

  expect(mockSignOut).toHaveBeenCalledTimes(1);
});
