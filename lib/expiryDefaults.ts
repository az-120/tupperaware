import { ItemCategory } from "../types";

const EXPIRY_DAYS: Record<string, number> = {
  // Dairy
  milk: 7,
  "whole milk": 7,
  "skim milk": 7,
  "2% milk": 7,
  cream: 10,
  butter: 21,
  yogurt: 14,
  cheese: 21,
  "cheddar cheese": 28,
  "cream cheese": 10,
  "sour cream": 14,
  "cottage cheese": 7,
  eggs: 21,
  // Produce
  apple: 21,
  banana: 5,
  strawberry: 5,
  strawberries: 5,
  blueberry: 7,
  blueberries: 7,
  grapes: 7,
  orange: 14,
  lemon: 21,
  lettuce: 7,
  spinach: 5,
  kale: 7,
  broccoli: 7,
  carrot: 21,
  celery: 14,
  tomato: 7,
  tomatoes: 7,
  cucumber: 7,
  zucchini: 7,
  potato: 30,
  potatoes: 30,
  onion: 30,
  onions: 30,
  garlic: 60,
  mushroom: 5,
  mushrooms: 5,
  pepper: 7,
  peppers: 7,
  avocado: 4,
  // Meat
  chicken: 3,
  "chicken breast": 3,
  "ground beef": 2,
  beef: 3,
  pork: 3,
  "pork chop": 3,
  fish: 2,
  salmon: 2,
  shrimp: 2,
  turkey: 3,
  bacon: 7,
  // Frozen
  "frozen pizza": 90,
  "frozen vegetables": 90,
  "ice cream": 60,
  // Pantry
  bread: 7,
  pasta: 365,
  rice: 365,
  cereal: 180,
  flour: 180,
  sugar: 365,
  "olive oil": 365,
  "peanut butter": 180,
  jam: 180,
  jelly: 180,
  honey: 730,
  oats: 180,
  oatmeal: 180,
};

const CATEGORY_DEFAULTS: Record<ItemCategory, number> = {
  Dairy: 7,
  Produce: 5,
  Meat: 3,
  Frozen: 90,
  Pantry: 180,
  Other: 7,
};

export function getExpiryDays(name: string, category: ItemCategory): number {
  const lower = name.toLowerCase().trim();

  // Exact match
  if (EXPIRY_DAYS[lower] !== undefined) return EXPIRY_DAYS[lower];

  // Substring match
  for (const [key, days] of Object.entries(EXPIRY_DAYS)) {
    if (lower.includes(key) || key.includes(lower)) return days;
  }

  // Category fallback
  return CATEGORY_DEFAULTS[category];
}

export function getSuggestedExpiryDate(name: string, category: ItemCategory): Date {
  const days = getExpiryDays(name, category);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
