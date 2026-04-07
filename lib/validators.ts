export interface ValidationResult {
  valid: boolean;
  errors: string[];
  rowCount: number;
}

const VALID_STATUSES = new Set(["active", "used", "discarded"]);
const VALID_CATEGORIES = new Set(["Dairy", "Produce", "Meat", "Frozen", "Pantry", "Other"]);
const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateItems(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    if (__DEV__) console.warn("[validators] validateItems: data is not an array");
    return {valid: false, errors: ["Expected an array"], rowCount: 0};
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;

    if (!item.id) errors.push(`[${i}] missing required field: id`);
    if (!item.name) errors.push(`[${i}] missing required field: name`);
    if (!item.category) errors.push(`[${i}] missing required field: category`);
    if (!item.status) errors.push(`[${i}] missing required field: status`);
    if (!item.location_id) errors.push(`[${i}] missing required field: location_id`);
    if (!item.expiry_date) errors.push(`[${i}] missing required field: expiry_date`);

    if (item.status && !VALID_STATUSES.has(item.status as string)) {
      errors.push(`[${i}] invalid status: ${String(item.status)}`);
    }
    if (item.category && !VALID_CATEGORIES.has(item.category as string)) {
      errors.push(`[${i}] invalid category: ${String(item.category)}`);
    }
    if (item.expiry_date && !DATE_REGEX.test(item.expiry_date as string)) {
      errors.push(`[${i}] invalid expiry_date format: ${String(item.expiry_date)}`);
    }

    if (__DEV__) {
      if (!item.emoji) console.warn(`[validators] item[${i}] missing optional field: emoji`);
      if (item.partially_used === undefined) console.warn(`[validators] item[${i}] missing optional field: partially_used`);
    }
  }

  const valid = errors.length === 0;
  if (__DEV__) {
    if (valid) {
      console.log(`[validators] items: ${data.length} rows validated OK`);
    } else {
      for (const e of errors) console.warn("[validators]", e);
    }
  }

  return {valid, errors, rowCount: data.length};
}

export function validateLocations(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    if (__DEV__) console.warn("[validators] validateLocations: data is not an array");
    return {valid: false, errors: ["Expected an array"], rowCount: 0};
  }

  for (let i = 0; i < data.length; i++) {
    const loc = data[i] as Record<string, unknown>;

    if (!loc.id) errors.push(`[${i}] missing required field: id`);
    if (!loc.household_id) errors.push(`[${i}] missing required field: household_id`);
    if (loc.name === undefined || loc.name === null) {
      errors.push(`[${i}] missing required field: name`);
    } else if (typeof loc.name !== "string" || loc.name.trim() === "") {
      errors.push(`[${i}] name must be a non-empty string`);
    }
  }

  const valid = errors.length === 0;
  if (__DEV__) {
    if (valid) {
      console.log(`[validators] locations: ${data.length} rows validated OK`);
    } else {
      for (const e of errors) console.warn("[validators]", e);
    }
  }

  return {valid, errors, rowCount: data.length};
}

export function validateHousehold(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (Array.isArray(data)) {
    if (__DEV__) console.warn("[validators] validateHousehold: expected object, got array");
    return {valid: false, errors: ["Expected an object, not an array"], rowCount: 0};
  }
  if (!data || typeof data !== "object") {
    if (__DEV__) console.warn("[validators] validateHousehold: data is not an object");
    return {valid: false, errors: ["Expected an object"], rowCount: 0};
  }

  const hh = data as Record<string, unknown>;

  if (!hh.id) errors.push("missing required field: id");
  if (hh.name === undefined || hh.name === null) {
    errors.push("missing required field: name");
  } else if (typeof hh.name !== "string" || hh.name.trim() === "") {
    errors.push("name must be a non-empty string");
  }

  const valid = errors.length === 0;
  if (__DEV__) {
    if (valid) {
      console.log("[validators] household: validated OK");
    } else {
      for (const e of errors) console.warn("[validators]", e);
    }
  }

  return {valid, errors, rowCount: 1};
}

export function validateRecipes(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    if (__DEV__) console.warn("[validators] validateRecipes: data is not an array");
    return {valid: false, errors: ["Expected an array"], rowCount: 0};
  }

  if (data.length > 3) {
    errors.push(`expected at most 3 recipes, got ${data.length}`);
  }

  for (let i = 0; i < data.length; i++) {
    const recipe = data[i] as Record<string, unknown>;

    if (!recipe.name) errors.push(`[${i}] missing required field: name`);
    if (!recipe.emoji) errors.push(`[${i}] missing required field: emoji`);
    if (!recipe.description || typeof recipe.description !== "string" || recipe.description.trim() === "") {
      errors.push(`[${i}] description must be a non-empty string`);
    }
    if (!recipe.cookTime) errors.push(`[${i}] missing required field: cookTime`);
    if (!recipe.difficulty) {
      errors.push(`[${i}] missing required field: difficulty`);
    } else if (!VALID_DIFFICULTIES.has(recipe.difficulty as string)) {
      errors.push(`[${i}] invalid difficulty: ${String(recipe.difficulty)}`);
    }
    if (!Array.isArray(recipe.usesItems) || recipe.usesItems.length === 0) {
      errors.push(`[${i}] usesItems must be a non-empty array`);
    }
  }

  const valid = errors.length === 0;
  if (__DEV__) {
    if (valid) {
      console.log(`[validators] recipes: ${data.length} rows validated OK`);
    } else {
      for (const e of errors) console.warn("[validators]", e);
    }
  }

  return {valid, errors, rowCount: data.length};
}
