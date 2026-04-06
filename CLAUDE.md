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

Task: Write integration tests for hooks and core data flows.

### Setup

Before writing any tests, check that these are in package.json
jest config — add if missing:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": [
    "@testing-library/jest-native/extend-expect"
  ],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

Also verify these are installed, install if missing:

```bash
npx expo install @testing-library/react-native
npm install --save-dev @testing-library/jest-native
```

### 1. Test setup file: `__tests__/setup.ts`

Create a shared test setup file that:

- Mocks AsyncStorage:

```typescript
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
```

- Mocks expo-notifications:

```typescript
jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({status: "granted"}),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification-id"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest
    .fn()
    .mockReturnValue({remove: jest.fn()}),
  addNotificationResponseReceivedListener: jest
    .fn()
    .mockReturnValue({remove: jest.fn()}),
}));
```

- Mocks expo-router:

```typescript
jest.mock("expo-router", () => ({
  useRouter: () => ({replace: jest.fn(), push: jest.fn(), back: jest.fn()}),
  useLocalSearchParams: () => ({}),
}));
```

- Sets up global fetch mock:

```typescript
global.fetch = jest.fn();
```

- Add to jest config in package.json:

```json
"setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
"setupFiles": ["./__tests__/setup.ts"]
```

### 2. `__tests__/useItems.test.ts`

Integration tests for hooks/useItems.ts:

```typescript
describe("useItems", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches and returns active items sorted by expiry_date asc");
  // mock fetch returning 2 items out of order
  // verify returned items are sorted by expiry_date ASC

  it("returns empty array when location has no items");
  // mock fetch returning []
  // verify items is []

  it("sets loading true initially then false after fetch");
  // verify loading starts true
  // after waitFor verify loading is false

  it("sets error when fetch fails");
  // mock fetch throwing a network error
  // verify error is set and items is []

  it("sets error when fetch returns non-ok response");
  // mock fetch returning { ok: false, status: 403 }
  // verify error is set

  it("refresh function re-fetches items");
  // call refresh()
  // verify fetch was called twice total
});
```

### 3. `__tests__/useLocations.test.ts`

Integration tests for hooks/useLocations.ts:

```typescript
describe("useLocations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches locations for a household");
  // mock fetch returning 3 locations
  // verify all 3 are returned

  it("fetches items for each location");
  // mock fetch returning locations with nested items
  // verify each location has an items array

  it("returns empty array when household has no locations");
  // mock fetch returning []
  // verify locations is []

  it("sets loading false after successful fetch");

  it("sets error on fetch failure");

  it("refresh re-fetches locations");
});
```

### 4. `__tests__/useHousehold.test.ts`

Integration tests for hooks/useHousehold.ts:

```typescript
describe("useHousehold", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null household when user has no household");
  // mock fetch returning []
  // verify household is null

  it("returns household when user is a member");
  // mock fetch returning a household row
  // verify household name matches

  it("returns locations alongside household");
  // mock fetch returning household with locations
  // verify locations array is populated

  it("sets loading false after fetch");

  it("sets error on fetch failure");

  it("refresh re-fetches household data");
});
```

### 5. `__tests__/useAuth.test.ts`

Integration tests for hooks/useAuth.ts:

```typescript
describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null user when no session exists");
  // mock supabase.auth.getSession returning null session
  // verify user is null

  it("returns user when session exists");
  // mock supabase.auth.getSession returning valid session
  // verify user.id matches

  it("signOut calls supabase.auth.signOut");
  // call signOut()
  // verify supabase.auth.signOut was called

  it("updates user when auth state changes");
  // trigger onAuthStateChange with a new session
  // verify user updates accordingly
});
```

### 6. `__tests__/addItemFlow.test.ts`

Integration test for the full add item submission flow:

```typescript
describe("Add item flow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submits valid item successfully");
  // render add item screen with a location_id param
  // fill in item name, category, expiry date
  // tap Add item button
  // verify fetch was called with correct body
  // verify navigation.back() was called

  it("shows validation error when name is empty");
  // render add item screen
  // tap Add item without filling name
  // verify inline error message is visible

  it("shows validation error when expiry date is missing");
  // render add item screen
  // fill name but not expiry
  // tap Add item
  // verify inline error is visible

  it("shows error message when Supabase insert fails");
  // mock fetch returning 403
  // fill valid form and submit
  // verify error message is shown on screen

  it("auto-populates expiry date when category is selected");
  // render add item screen
  // select Dairy category
  // verify expiry date picker updates to ~7 days from now

  it("auto-populates expiry date when known item name is typed");
  // type 'eggs' in name field
  // wait for debounce
  // verify expiry date updates to ~21 days from now
});
```

### 7. Update `__tests__/expiryDefaults.test.ts`

Add these additional integration-level test cases:

- getSuggestedExpiryDate returns a normalized date (hours set to 12)
- getSuggestedExpiryDate for 'eggs' returns date ~21 days from now
- getSuggestedExpiryDate for unknown item falls back to category default
- normalizeDate sets hours to 12 regardless of input time
- normalizeDate does not change the date when called at noon

### Notes

- All hooks likely use raw fetch — mock global.fetch in setup.ts
- Mock supabase auth methods where needed:

```typescript
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {subscription: {unsubscribe: jest.fn()}},
      })),
    },
  },
}));
```

- Use renderHook and waitFor from @testing-library/react-native
  for all hook tests
- Use render and fireEvent for the addItemFlow screen test
- After all test files are written run `npm test` and fix ALL
  failing tests before committing
- Suggest a git commit message when done
