export type ValidationResult = { valid: boolean; error: string | null };

export function validateItemName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Item name is required." };
  if (trimmed.length < 2) return { valid: false, error: "Item name must be at least 2 characters." };
  if (trimmed.length > 100) return { valid: false, error: "Item name must be 100 characters or fewer." };
  return { valid: true, error: null };
}

export function validateHouseholdName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Household name is required." };
  if (trimmed.length < 2) return { valid: false, error: "Household name must be at least 2 characters." };
  if (trimmed.length > 60) return { valid: false, error: "Household name must be 60 characters or fewer." };
  return { valid: true, error: null };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: "Email is required." };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: "Enter a valid email address." };
  return { valid: true, error: null };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < 6) return { valid: false, error: "Password must be at least 6 characters." };
  if (password.length > 128) return { valid: false, error: "Password must be 128 characters or fewer." };
  return { valid: true, error: null };
}

export function validateExpiryDate(date: Date): ValidationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return { valid: false, error: "Expiry date cannot be in the past." };
  return { valid: true, error: null };
}

export function validateQuantity(quantity: string): ValidationResult {
  const trimmed = quantity.trim();
  if (trimmed.length > 50) return { valid: false, error: "Quantity must be 50 characters or fewer." };
  return { valid: true, error: null };
}
