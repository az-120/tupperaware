const FOOD_EXPIRY_DAYS: Record<string, number> = {
  // Dairy
  milk: 7,
  "whole milk": 7,
  "skim milk": 7,
  "oat milk": 7,
  "almond milk": 7,
  eggs: 21,
  egg: 21,
  butter: 30,
  "cream cheese": 14,
  "cottage cheese": 7,
  "sour cream": 14,
  "heavy cream": 14,
  yogurt: 14,
  "greek yogurt": 14,
  cheddar: 30,
  cheese: 21,
  mozzarella: 14,
  parmesan: 60,
  // Produce
  spinach: 5,
  lettuce: 5,
  kale: 7,
  arugula: 4,
  broccoli: 5,
  cauliflower: 7,
  carrots: 21,
  celery: 14,
  cucumber: 7,
  zucchini: 7,
  "bell pepper": 7,
  tomato: 5,
  strawberries: 4,
  blueberries: 7,
  raspberries: 3,
  grapes: 7,
  apple: 30,
  banana: 5,
  avocado: 4,
  lemon: 21,
  lime: 21,
  orange: 14,
  // Meat
  chicken: 3,
  "chicken breast": 3,
  "ground beef": 2,
  beef: 3,
  pork: 3,
  bacon: 7,
  salmon: 2,
  fish: 2,
  shrimp: 2,
  turkey: 3,
  ham: 5,
  sausage: 3,
  // Frozen
  "frozen chicken": 90,
  "frozen beef": 90,
  "frozen fish": 90,
  "ice cream": 60,
  "frozen pizza": 60,
  "frozen vegetables": 180,
  // Pantry
  bread: 7,
  sourdough: 5,
  bagel: 5,
  tortilla: 14,
  pasta: 365,
  rice: 365,
  oats: 365,
  cereal: 180,
  "peanut butter": 180,
  jam: 180,
  honey: 730,
  "olive oil": 365,
  mayo: 60,
  ketchup: 180,
  mustard: 180,
  "hot sauce": 365,
  "soy sauce": 365,
  juice: 7,
  "orange juice": 7,
};

const CATEGORY_DEFAULTS: Record<string, number> = {
  Dairy: 7,
  Produce: 5,
  Meat: 3,
  Frozen: 90,
  Pantry: 180,
  Other: 7,
};

export function getExpiryDays(name: string, category: string): number {
  const lower = name.toLowerCase().trim();

  if (FOOD_EXPIRY_DAYS[lower] !== undefined) {
    return FOOD_EXPIRY_DAYS[lower];
  }

  for (const key of Object.keys(FOOD_EXPIRY_DAYS)) {
    if (lower.includes(key)) {
      return FOOD_EXPIRY_DAYS[key];
    }
  }

  return CATEGORY_DEFAULTS[category] ?? 7;
}

export function getSuggestedExpiryDate(name: string, category: string): Date {
  const days = getExpiryDays(name, category);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return normalizeDate(date);
}

/**
 * Normalizes a date to local noon so that toISOString().split("T")[0] always
 * returns the correct local calendar date regardless of the device's UTC offset.
 * Accepts a YYYY-MM-DD string (safe parsing) or an existing Date object.
 */
export function normalizeDate(dateOrStr: Date | string): Date {
  if (typeof dateOrStr === "string") {
    // Append local noon to avoid UTC-midnight parsing (the -1 day bug)
    return new Date(`${dateOrStr}T12:00:00`);
  }
  // Re-anchor an existing Date to noon of the same local calendar day
  return new Date(
    dateOrStr.getFullYear(),
    dateOrStr.getMonth(),
    dateOrStr.getDate(),
    12, 0, 0,
  );
}
