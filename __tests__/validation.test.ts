import {
  validateItemName,
  validateHouseholdName,
  validateEmail,
  validatePassword,
  validateExpiryDate,
  validateQuantity,
} from "../lib/validation";

// ── validateItemName ─────────────────────────────────────────────────────────

describe("validateItemName", () => {
  it("accepts a normal item name", () => {
    expect(validateItemName("Whole Milk")).toEqual({ valid: true, error: null });
  });

  it("rejects empty string", () => {
    const result = validateItemName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects whitespace-only string", () => {
    const result = validateItemName("   ");
    expect(result.valid).toBe(false);
  });

  it("rejects single character", () => {
    const result = validateItemName("A");
    expect(result.valid).toBe(false);
  });

  it("rejects names over 100 characters", () => {
    const result = validateItemName("A".repeat(101));
    expect(result.valid).toBe(false);
  });

  it("accepts exactly 2 characters", () => {
    expect(validateItemName("Ab")).toEqual({ valid: true, error: null });
  });

  it("accepts exactly 100 characters", () => {
    expect(validateItemName("A".repeat(100))).toEqual({ valid: true, error: null });
  });
});

// ── validateHouseholdName ────────────────────────────────────────────────────

describe("validateHouseholdName", () => {
  it("accepts a normal household name", () => {
    expect(validateHouseholdName("The Zhao Family")).toEqual({ valid: true, error: null });
  });

  it("rejects empty string", () => {
    const result = validateHouseholdName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects whitespace-only", () => {
    expect(validateHouseholdName("  ").valid).toBe(false);
  });

  it("rejects single character", () => {
    expect(validateHouseholdName("X").valid).toBe(false);
  });

  it("rejects names over 60 characters", () => {
    expect(validateHouseholdName("A".repeat(61)).valid).toBe(false);
  });

  it("accepts exactly 60 characters", () => {
    expect(validateHouseholdName("A".repeat(60))).toEqual({ valid: true, error: null });
  });
});

// ── validateEmail ────────────────────────────────────────────────────────────

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("user@example.com")).toEqual({ valid: true, error: null });
  });

  it("rejects empty string", () => {
    expect(validateEmail("").valid).toBe(false);
  });

  it("rejects email without @", () => {
    expect(validateEmail("userexample.com").valid).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(validateEmail("user@").valid).toBe(false);
  });

  it("rejects email without TLD", () => {
    expect(validateEmail("user@example").valid).toBe(false);
  });

  it("accepts email with subdomain", () => {
    expect(validateEmail("user@mail.example.com")).toEqual({ valid: true, error: null });
  });

  it("trims whitespace before validating", () => {
    expect(validateEmail("  user@example.com  ")).toEqual({ valid: true, error: null });
  });
});

// ── validatePassword ─────────────────────────────────────────────────────────

describe("validatePassword", () => {
  it("accepts a password of 6+ chars", () => {
    expect(validatePassword("secret")).toEqual({ valid: true, error: null });
  });

  it("rejects empty string", () => {
    expect(validatePassword("").valid).toBe(false);
  });

  it("rejects password shorter than 6 chars", () => {
    expect(validatePassword("abc").valid).toBe(false);
  });

  it("accepts exactly 6 characters", () => {
    expect(validatePassword("abcdef")).toEqual({ valid: true, error: null });
  });

  it("rejects password over 128 chars", () => {
    expect(validatePassword("a".repeat(129)).valid).toBe(false);
  });

  it("accepts exactly 128 characters", () => {
    expect(validatePassword("a".repeat(128))).toEqual({ valid: true, error: null });
  });
});

// ── validateExpiryDate ───────────────────────────────────────────────────────

describe("validateExpiryDate", () => {
  it("accepts a future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    expect(validateExpiryDate(future)).toEqual({ valid: true, error: null });
  });

  it("accepts today", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    expect(validateExpiryDate(today)).toEqual({ valid: true, error: null });
  });

  it("rejects a past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(validateExpiryDate(past).valid).toBe(false);
  });

  it("rejects a date far in the past", () => {
    expect(validateExpiryDate(new Date("2020-01-01")).valid).toBe(false);
  });

  it("accepts a date far in the future", () => {
    expect(validateExpiryDate(new Date("2099-12-31"))).toEqual({ valid: true, error: null });
  });
});

// ── validateQuantity ─────────────────────────────────────────────────────────

describe("validateQuantity", () => {
  it("accepts empty quantity (optional field)", () => {
    expect(validateQuantity("")).toEqual({ valid: true, error: null });
  });

  it("accepts a normal quantity string", () => {
    expect(validateQuantity("1 gal")).toEqual({ valid: true, error: null });
  });

  it("accepts exactly 50 characters", () => {
    expect(validateQuantity("A".repeat(50))).toEqual({ valid: true, error: null });
  });

  it("rejects quantity over 50 characters", () => {
    expect(validateQuantity("A".repeat(51)).valid).toBe(false);
  });

  it("accepts numeric quantity", () => {
    expect(validateQuantity("12")).toEqual({ valid: true, error: null });
  });
});
