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

Task: Add forgot password flow to authentication screens.

### 1. Screen: `app/auth/forgot-password.tsx`

A simple screen for requesting a password reset email:

- Single email text input
- Validates email using validateEmail from lib/validation.ts
- Show inline error if validation fails
- "Send reset email" button that calls:
  `supabase.auth.resetPasswordForEmail(email)`
- Three states to handle:
  - Default: email input + send button
  - Loading: spinner + "Sending..." text
  - Success: hide the form entirely, show a success message:
    "Check your email — we sent a password reset link to {email}"
    with a "Back to sign in" link below
- Error state: inline error message if Supabase call fails
- Navigation bar title "Forgot password" with back button

### 2. Update `app/auth/sign-in.tsx`

- Add a "Forgot password?" text link below the password input
- Navigates to /auth/forgot-password
- Style as muted blue text, right-aligned or centered

### Notes

- No new Supabase schema changes needed
- Use supabase client directly (not raw fetch) — auth methods
  work fine with the Supabase JS client
- Use StyleSheet.create for all styles
- After files written run `npx tsc --noEmit` and fix any errors
- Suggest a git commit message when done
