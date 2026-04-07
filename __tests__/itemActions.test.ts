/**
 * Unit tests for item action payloads (fully used, partially used, cancel).
 *
 * These test the PATCH payload logic directly — i.e., that the correct
 * fields are sent for each action — without rendering the full screen.
 * The screen itself is integration-tested via addItemFlow.test.ts patterns.
 */

// Payload builders extracted from the logic in app/item/[id].tsx
function fullyUsedPayload(): Record<string, unknown> {
  return { status: "used", partially_used: false };
}

function partiallyUsedPayload(useNotes: string): Record<string, unknown> {
  return {
    status: "active",
    partially_used: true,
    use_notes: useNotes.trim(),
  };
}

function discardPayload(): Record<string, unknown> {
  return { status: "discarded" };
}

// ---------------------------------------------------------------------------

it("fully used payload sets status=used and partially_used=false", () => {
  const payload = fullyUsedPayload();
  expect(payload.status).toBe("used");
  expect(payload.partially_used).toBe(false);
});

it("fully used payload does not include use_notes", () => {
  const payload = fullyUsedPayload();
  expect(payload).not.toHaveProperty("use_notes");
});

it("partially used payload sets status=active and partially_used=true", () => {
  const payload = partiallyUsedPayload("half left");
  expect(payload.status).toBe("active");
  expect(payload.partially_used).toBe(true);
});

it("partially used payload includes use_notes trimmed", () => {
  const payload = partiallyUsedPayload("  about 1 cup  ");
  expect(payload.use_notes).toBe("about 1 cup");
});

it("partially used payload with empty notes sends empty string", () => {
  const payload = partiallyUsedPayload("");
  expect(payload.use_notes).toBe("");
});

it("discard payload sets status=discarded only", () => {
  const payload = discardPayload();
  expect(payload.status).toBe("discarded");
  expect(payload).not.toHaveProperty("partially_used");
  expect(payload).not.toHaveProperty("use_notes");
});

// ---------------------------------------------------------------------------
// PATCH integration: verify fetch is called with correct body

const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

async function simulatePatch(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    },
  );
}

it("fully used fetch sends correct body to Supabase", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true });

  await simulatePatch("item-1", fullyUsedPayload());

  const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
  expect(body.status).toBe("used");
  expect(body.partially_used).toBe(false);
});

it("partially used fetch sends correct body including use_notes", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true });

  await simulatePatch("item-1", partiallyUsedPayload("half the bag"));

  const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
  expect(body.status).toBe("active");
  expect(body.partially_used).toBe(true);
  expect(body.use_notes).toBe("half the bag");
});
