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
- [x] Recipe suggestions based on items expiring soon
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

## Testing & validation standards

### Testing framework

- Jest + React Native Testing Library
- Test files live in `__tests__/` folder at root level
- Test file naming: `[filename].test.ts` or `[filename].test.tsx`
- Run tests with: `npm test`

### What to test

- All utility functions in `lib/` — pure functions are highest priority
- Input validation logic
- Data transformation functions
- Hook logic where possible

### Testing requirement for new features

Every new feature task must include unit tests. Specifically:

- Any new utility function in `lib/` must have corresponding tests
  in `__tests__/`
- Any new validation logic must be tested
- Tests must be written in the same task as the feature, not after
- After writing tests always run `npm test` and fix any failures before considering the task complete
- CC must suggest test cases for UI logic even if they aren't formally written as unit tests

### Input validation rules

- Item name: required, min 2 chars, max 100 chars, no special chars
- Household name: required, min 2 chars, max 50 chars
- Email: standard email format validation
- Expiry date: must be a valid date, not more than 10 years in future
- Quantity: optional, max 20 chars
- All validation errors must show inline below the relevant input field
- Validate on submit AND on blur (when user leaves a field)

### Validation utility

- All validation logic lives in `lib/validation.ts`
- Exported as pure functions so they are easily testable
- Each function returns `{ valid: boolean, error: string | null }`

---

## Current task

Task: Implement a systematic validation plan for data correctness
across the entire codebase.

### 1. `__tests__/fixtures.ts` — shared canonical test dataset

Create a single source of truth for test data used across ALL
test files:

```typescript
import {Item, Location, Household} from "../types";

export const mockHousehold: Household = {
  id: "hh-1",
  name: "Test Household",
  created_at: "2026-01-01T00:00:00Z",
};

export const mockLocations: Location[] = [
  {
    id: "loc-1",
    name: "Fridge",
    icon: "🧊",
    household_id: "hh-1",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "loc-2",
    name: "Pantry",
    icon: "🥫",
    household_id: "hh-1",
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockItems: Item[] = [
  {
    id: "1",
    name: "Whole Milk",
    category: "Dairy",
    status: "used",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🥛",
    expiry_date: "2026-04-10",
    quantity: "1 gal",
    updated_at: "2026-03-01T12:00:00Z",
    created_at: "2026-02-20T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "2",
    name: "Spinach",
    category: "Produce",
    status: "discarded",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🥦",
    expiry_date: "2026-03-28",
    quantity: "1 bag",
    updated_at: "2026-03-05T12:00:00Z",
    created_at: "2026-02-25T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "3",
    name: "Chicken Breast",
    category: "Meat",
    status: "discarded",
    partially_used: false,
    location_id: "loc-2",
    emoji: "🥩",
    expiry_date: "2026-03-30",
    quantity: "2 lbs",
    updated_at: "2026-03-10T12:00:00Z",
    created_at: "2026-03-08T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "4",
    name: "Eggs",
    category: "Dairy",
    status: "active",
    partially_used: true,
    location_id: "loc-1",
    emoji: "🥚",
    expiry_date: "2026-04-20",
    quantity: "12 ct",
    updated_at: "2026-03-15T12:00:00Z",
    created_at: "2026-03-01T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "5",
    name: "Rice",
    category: "Pantry",
    status: "used",
    partially_used: false,
    location_id: "loc-2",
    emoji: "🥫",
    expiry_date: "2026-12-01",
    quantity: "5 lbs",
    updated_at: "2026-03-20T12:00:00Z",
    created_at: "2026-03-10T12:00:00Z",
    added_by: "user-1",
  },
  {
    id: "6",
    name: "Greek Yogurt",
    category: "Dairy",
    status: "active",
    partially_used: false,
    location_id: "loc-1",
    emoji: "🫙",
    expiry_date: "2026-04-14",
    quantity: "32oz",
    updated_at: "2026-03-20T12:00:00Z",
    created_at: "2026-03-15T12:00:00Z",
    added_by: "user-1",
  },
];

// Known expected outputs — pre-computed by hand for verification
export const expectedSummary = {
  totalConsumed: 4, // milk(used) + spinach(discarded) +
  // chicken(discarded) + rice(used)
  totalUsed: 2, // milk, rice
  totalDiscarded: 2, // spinach, chicken
  wasteRate: 50, // 2 discarded / 4 consumed * 100
  activeItems: 2, // eggs, yogurt
  partialItems: 1, // eggs
};

export const expectedCategoryWaste = [
  {category: "Dairy", discarded: 0, used: 1, wasteRate: 0},
  {category: "Produce", discarded: 1, used: 0, wasteRate: 100},
  {category: "Meat", discarded: 1, used: 0, wasteRate: 100},
  {category: "Pantry", discarded: 0, used: 1, wasteRate: 0},
];
```

### 2. `lib/validators.ts` — runtime data shape validators

Create a utility for validating data shapes from Supabase before
use in the app. Export these pure functions:

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  rowCount: number;
}

export function validateItems(data: unknown): ValidationResult;
// Checks:
// - data is an array
// - each item has required fields: id, name, category, status,
//   location_id, expiry_date
// - status is one of: 'active', 'used', 'discarded'
// - category is one of: 'Dairy','Produce','Meat','Frozen','Pantry','Other'
// - expiry_date is a valid date string (YYYY-MM-DD format)
// - logs warning for any item missing optional fields

export function validateLocations(data: unknown): ValidationResult;
// Checks:
// - data is an array
// - each location has: id, name, household_id
// - name is non-empty string

export function validateHousehold(data: unknown): ValidationResult;
// Checks:
// - data is an object (not array)
// - has required fields: id, name
// - name is non-empty string

export function validateRecipes(data: unknown): ValidationResult;
// Checks:
// - data is an array of 1-3 items
// - each recipe has: name, emoji, usesItems, description,
//   cookTime, difficulty
// - difficulty is one of: 'Easy', 'Medium', 'Hard'
// - usesItems is a non-empty array
// - description is non-empty string
```

Each validator should:

- Log a warning in `__DEV__` mode for each validation error found
- Log row count on success: `[validators] items: 12 rows validated OK`
- Return ValidationResult with all errors collected (not just first)

### 3. Add `__DEV__` logging to all `lib/` utilities

Update each file with intermediate result logging:

`lib/analytics.ts` — log after each computation:

```typescript
if (__DEV__) {
  console.log("[analytics] input:", items.length, "items");
  console.log(
    "[analytics] used:",
    totalUsed,
    "discarded:",
    totalDiscarded,
    "waste rate:",
    wasteRate.toFixed(1) + "%",
  );
  console.log(
    "[analytics] category breakdown:",
    categoryWaste.map((c) => `${c.category}:${c.wasteRate}%`),
  );
}
```

`lib/expiryDefaults.ts` — log lookup results:

```typescript
if (__DEV__) {
  console.log(
    "[expiryDefaults] lookup:",
    name,
    "→",
    days,
    "days (source:",
    source,
    ")",
  );
  // source should be 'exact', 'partial', or 'category fallback'
}
```

`lib/openFoodFacts.ts` — log API response:

```typescript
if (__DEV__) {
  console.log("[openFoodFacts] barcode:", barcode);
  console.log("[openFoodFacts] raw response:", JSON.stringify(data));
  console.log("[openFoodFacts] parsed:", result);
}
```

`lib/anthropic.ts` — log prompt and response:

```typescript
if (__DEV__) {
  console.log("[anthropic] prompt length:", prompt.length, "chars");
  console.log("[anthropic] raw response:", rawText.slice(0, 200));
  console.log("[anthropic] parsed recipes:", recipes.length);
}
```

`lib/validation.ts` — log validation failures:

```typescript
if (__DEV__ && !result.valid) {
  console.warn("[validation] failed:", field, "→", result.error);
}
```

### 4. Integrate `lib/validators.ts` into hooks

Update each hook to validate Supabase responses before setting state:

`hooks/useItems.ts`:

```typescript
const result = validateItems(json);
if (__DEV__ && !result.valid) {
  console.warn("[useItems] validation errors:", result.errors);
}
// still set state even if invalid — don't block the UI
// but log so developer knows data is malformed
setItems(json as Item[]);
```

Apply same pattern to `hooks/useLocations.ts` and
`hooks/useHousehold.ts`.

### 5. Update ALL existing test files to use fixtures

Update these test files to import from `__tests__/fixtures.ts`
instead of defining their own inline mock data:

- `__tests__/analytics.test.ts`
- `__tests__/expiryDefaults.test.ts`
- `__tests__/validation.test.ts`
- `__tests__/openFoodFacts.test.ts`
- `__tests__/anthropic.test.ts`

### 6. Add range checks and known-answer tests to ALL test files

`__tests__/analytics.test.ts` — add:

```typescript
describe("range checks", () => {
  it("waste rate is always between 0 and 100");
  it("totalUsed + totalDiscarded always equals totalConsumed");
  it("item counts are never negative");
  it("waste rate is exactly 50% for mockItems dataset");
  // verify against expectedSummary from fixtures
  it("computeSummary matches expectedSummary for fixture dataset");
});
```

`__tests__/expiryDefaults.test.ts` — add:

```typescript
describe("range checks", () => {
  it("getExpiryDays always returns a positive number");
  it("getExpiryDays never returns 0 or negative");
  it("getSuggestedExpiryDate always returns a future date");
  it("normalizeDate always sets hours to 12");
  it("known answer: eggs → exactly 21 days");
  it("known answer: milk → exactly 7 days");
  it("known answer: unknown item with Dairy category → 7 days fallback");
});
```

`__tests__/validation.test.ts` — add:

```typescript
describe("boundary checks", () => {
  it("item name at exactly 2 chars is valid");
  it("item name at exactly 100 chars is valid");
  it("item name at 1 char is invalid");
  it("item name at 101 chars is invalid");
  it("household name at exactly 2 chars is valid");
  it("household name at exactly 50 chars is valid");
  it("known valid email passes");
  it("known invalid emails fail: missing @, missing domain, empty");
});
```

`__tests__/validators.test.ts` — new file:

```typescript
describe("validateItems", () => {
  it("returns valid for well-formed mockItems fixture");
  it("returns rowCount matching input array length");
  it("catches item missing required id field");
  it("catches invalid status value");
  it("catches invalid category value");
  it("catches malformed expiry_date string");
  it("handles empty array — valid with rowCount 0");
  it("handles non-array input — returns invalid");
});

describe("validateLocations", () => {
  it("returns valid for mockLocations fixture");
  it("catches missing household_id");
  it("catches empty name string");
});

describe("validateRecipes", () => {
  it("returns valid for well-formed recipe array");
  it("catches more than 3 recipes");
  it("catches invalid difficulty value");
  it("catches empty usesItems array");
});
```

### Notes

- fixtures.ts is imported by ALL test files — get it right first
  before updating other tests
- validators.ts is pure functions only — no React, no Supabase
- **DEV** is a global boolean in React Native — no import needed
- Do not change any application logic — only add logging and
  validation checks around existing logic
- After all files written run `npm test` and fix ALL failing tests
- Then run `npx tsc --noEmit` and fix type errors
- Suggest a git commit message when done
