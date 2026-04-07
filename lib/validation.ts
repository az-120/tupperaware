export type ValidationResult = { valid: boolean; error: string | null };

function logged(field: string, result: ValidationResult): ValidationResult {
  if (__DEV__ && !result.valid) {
    console.warn("[validation] failed:", field, "→", result.error);
  }
  return result;
}

export function validateItemName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return logged("itemName", { valid: false, error: "Item name is required." });
  if (trimmed.length < 2) return logged("itemName", { valid: false, error: "Item name must be at least 2 characters." });
  if (trimmed.length > 100) return logged("itemName", { valid: false, error: "Item name must be 100 characters or fewer." });
  return { valid: true, error: null };
}

export function validateHouseholdName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return logged("householdName", { valid: false, error: "Household name is required." });
  if (trimmed.length < 2) return logged("householdName", { valid: false, error: "Household name must be at least 2 characters." });
  if (trimmed.length > 60) return logged("householdName", { valid: false, error: "Household name must be 60 characters or fewer." });
  return { valid: true, error: null };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return logged("email", { valid: false, error: "Email is required." });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return logged("email", { valid: false, error: "Enter a valid email address." });
  return { valid: true, error: null };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return logged("password", { valid: false, error: "Password is required." });
  if (password.length < 6) return logged("password", { valid: false, error: "Password must be at least 6 characters." });
  if (password.length > 128) return logged("password", { valid: false, error: "Password must be 128 characters or fewer." });
  return { valid: true, error: null };
}

export function validateExpiryDate(date: Date): ValidationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return logged("expiryDate", { valid: false, error: "Expiry date cannot be in the past." });
  return { valid: true, error: null };
}

export function validateQuantity(quantity: string): ValidationResult {
  const trimmed = quantity.trim();
  if (trimmed.length > 50) return logged("quantity", { valid: false, error: "Quantity must be 50 characters or fewer." });
  return { valid: true, error: null };
}
