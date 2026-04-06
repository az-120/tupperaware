# TupperAware — Claude Code Spec

## Project overview

TupperAware is an iOS app (React Native + Expo) that tracks household food inventory
and expiration dates. Users belong to a household, which contains named locations
(fridge, pantry, freezer, etc.), each holding food items with expiry tracking and
push notification alerts.

Being built solo with Claude Code as an empirical case study in LLM-driven
development, compared against a 4-person 48-hour hackathon baseline.

---

## Tech stack

| Layer           | Choice                               |
| --------------- | ------------------------------------ |
| Framework       | React Native + Expo (TypeScript)     |
| Backend / DB    | Supabase (Postgres + Auth + Storage) |
| Notifications   | expo-notifications                   |
| Camera / Scan   | expo-camera + expo-barcode-scanner   |
| Navigation      | expo-router (file-based)             |
| State           | React Context + hooks (no Redux)     |
| Styling         | StyleSheet (no Tailwind)             |
| Target platform | iOS (App Store via EAS Build)        |

---

## Data model

### Tables

```
households
  id          uuid PK
  name        text
  created_at  timestamp

household_members
  id             uuid PK
  household_id   uuid FK -> households.id
  user_id        uuid FK -> auth.users.id
  role           text ('owner' | 'member')
  joined_at      timestamp

locations
  id             uuid PK
  household_id   uuid FK -> households.id
  name           text  ('Fridge' | 'Pantry' | 'Freezer' | custom)
  icon           text  (emoji or icon key)
  created_at     timestamp

items
  id             uuid PK
  location_id    uuid FK -> locations.id
  name           text
  category       text  ('Dairy' | 'Produce' | 'Meat' | 'Frozen' | 'Pantry' | 'Other')
  quantity       text  (e.g. '1 gal', '12 ct')
  expiry_date    date
  barcode        text  (nullable)
  status         text  ('active' | 'used' | 'discarded')
  added_by       uuid FK -> auth.users.id
  created_at     timestamp
  updated_at     timestamp
```

### Key rules

- Items are fetched by `location_id`, sorted by `expiry_date` ASC
- "Expiring soon" = expiry_date within 3 days of today
- "Expired" = expiry_date < today
- Deleting a location soft-deletes its items (set status = 'discarded')
- RLS: users can only read/write data belonging to their household

---

## App screens & navigation

```
(tabs)
├── index          → Household home (location cards + expiry summary)
├── expiring       → All items expiring within 3 days, across all locations
├── search         → Search items by name across household
└── profile        → Account, household settings, notification prefs

(stack — launched from home)
├── location/[id]  → Location view (items list, filter: all/expiring/category)
├── item/[id]      → Item detail (metadata, freshness bar, mark used/discard)
└── item/add       → Add item (scan tab + manual tab, location selector)

(auth — shown when no session)
├── sign-in
└── create-account → then → create-household → app home
```

---

## MVP features (must ship)

- [x] Auth — Supabase email/password sign in + sign up
- [x] Household creation with custom name + default locations
- [x] Location cards on home screen with item chips
- [x] Expiry status pills: red (≤2 days), amber (3–5 days), green (6+ days)
- [x] Add item — manual form (name, qty, category, location, expiry date)
- [x] Add item — barcode scan → auto-fill name via Open Food Facts API
- [x] Item detail — mark as used / discard
- [x] Expiry alerts — push notifications 1 day before expiry
- [x] Stat cards on home (total items, expiring soon, fresh count)

## V2 / stretch features

- [ ] Receipt scanning via camera + AI parsing
- [ ] Recipe suggestions based on items expiring soon
- [ ] Waste tracking analytics (used vs discarded over time)
- [ ] Nutritional info from Open Food Facts
- [ ] Invite members by email
- [ ] Shared household real-time sync (Supabase Realtime)

---

## Project structure

```
tupperaware/
├── app/                    # expo-router screens
│   ├── (tabs)/
│   │   ├── index.tsx       # Household home
│   │   ├── expiring.tsx
│   │   ├── search.tsx
│   │   └── profile.tsx
│   ├── location/
│   │   └── [id].tsx
│   ├── item/
│   │   ├── [id].tsx
│   │   └── add.tsx
│   └── auth/
│       ├── sign-in.tsx
│       └── create-account.tsx
├── components/             # Reusable UI components
│   ├── ItemRow.tsx
│   ├── LocationCard.tsx
│   ├── ExpiryPill.tsx
│   ├── StatCard.tsx
│   └── BarcodeScanner.tsx
├── hooks/                  # Custom hooks
│   ├── useHousehold.ts
│   ├── useLocations.ts
│   ├── useItems.ts
│   └── useNotifications.ts
├── lib/                    # Utilities + clients
│   ├── supabase.ts         # Supabase client init
│   ├── notifications.ts    # Expo notifications setup
│   └── openFoodFacts.ts    # Barcode lookup API
├── types/                  # TypeScript types
│   └── index.ts
├── constants/
│   └── colors.ts           # Color palette (matches mockups)
├── CLAUDE.md               # ← this file
├── app.json
├── package.json
└── tsconfig.json
```

---

## Color palette (from mockups)

```ts
// constants/colors.ts
export const Colors = {
  blue: "#185FA5",
  blueBg: "#E6F1FB",
  green: "#3B6D11",
  greenBg: "#EAF3DE",
  amber: "#854F0B",
  amberBg: "#FAEEDA",
  red: "#A32D2D",
  redBg: "#FCEBEB",
  textPrimary: "#2C2C2A",
  textSecondary: "#5F5E5A",
  border: "#D3D1C7",
  surface: "#F1EFE8",
};
```

---

## Expiry logic

```ts
// Given an expiry_date string (YYYY-MM-DD), return status
export function getExpiryStatus(
  expiryDate: string,
): "expired" | "critical" | "warning" | "fresh" {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return "expired";
  if (days <= 2) return "critical"; // red pill
  if (days <= 5) return "warning"; // amber pill
  return "fresh"; // green pill
}
```

---

## Environment variables

```
# .env.local (never commit this)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Claude Code conventions

- Always use TypeScript. No `any` types.
- Prefer named exports over default exports for components.
- Hooks live in `/hooks`, pure utility functions in `/lib`.
- Never write inline styles longer than 2 properties — use StyleSheet.create.
- When adding a new screen, update the screen list in this file.
- After each completed feature, output a one-line git commit message suggestion.
- If a task requires a Supabase schema change, output the SQL migration first and wait for confirmation before writing app code.

---

## Current task

Task 3 of 3: Add predetermined expiration date suggestions based on
item name and category.

### Goal

When a user is adding or editing an item, the expiry date picker
should auto-suggest a sensible default based on the item name and
category. The user can always override it manually.

### 1. Update `lib/expiryDefaults.ts`

Add the following to the existing file:

A common foods dictionary:

```typescript
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
```

Export these functions:

```typescript
export function getExpiryDays(name: string, category: string): number;
// 1. Lowercase name, check exact match in FOOD_EXPIRY_DAYS
// 2. If no exact match, check if any key is contained in name
// 3. Fall back to category defaults:
//    Dairy→7, Produce→5, Meat→3, Frozen→90, Pantry→180, Other→7

export function getSuggestedExpiryDate(name: string, category: string): Date;
// Calls getExpiryDays(), adds that many days to today,
// applies normalizeDate() before returning
```

### 2. Update `app/item/add.tsx`

- Import getExpiryDays and getSuggestedExpiryDate
- Add a boolean state variable `dateManuallyEdited` initialized to false
- When category changes: if !dateManuallyEdited, call
  getSuggestedExpiryDate() and update the date picker
- When item name changes, use a 500ms debounce: if !dateManuallyEdited,
  call getSuggestedExpiryDate() and update the date picker
- When barcode scan auto-populates name and category: set
  dateManuallyEdited to false and call getSuggestedExpiryDate()
- When user manually changes the date picker: set dateManuallyEdited
  to true
- Show muted hint text below date picker when !dateManuallyEdited:
  "Suggested based on item type — tap to adjust"
  Hide hint when dateManuallyEdited is true

### 3. Update `app/item/edit.tsx`

- Import getSuggestedExpiryDate
- Add a "Reset to suggested date" text button below the date picker
- Tapping it calls getSuggestedExpiryDate() with current name and
  category and resets the date picker

### Notes

- normalizeDate is already in lib/expiryDefaults.ts from Task 2 —
  use it inside getSuggestedExpiryDate
- Do not change any picker UI from Task 1
- After all files written run `npx tsc --noEmit` and fix any errors
- Suggest a git commit message when done
