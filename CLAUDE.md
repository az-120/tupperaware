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

Task: Visual polish — white backgrounds and Inter typography.

### 1. Install Inter font

Run before writing any code:

```bash
npx expo install expo-font @expo-google-fonts/inter
```

### 2. Update `app/_layout.tsx`

Load Inter font variants on app startup:

```typescript
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  // ... rest of existing layout logic
}
```

### 3. Update `constants/typography.ts` (create new file)

```typescript
export const Typography = {
  // Font families
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",

  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  loose: 1.7,

  // Letter spacing
  tight_tracking: -0.3,
  normal_tracking: 0,
  wide_tracking: 0.5,
  wider_tracking: 1.0,
};
```

### 4. Update `constants/colors.ts`

Refine the color palette for a cleaner white-first design:

```typescript
export const Colors = {
  // Base
  white: "#FFFFFF",
  background: "#FFFFFF", // was gray — now pure white
  surface: "#FFFFFF", // cards also white
  surfaceAlt: "#F8F8F8", // very subtle off-white for inputs
  border: "#EBEBEB", // lighter, more refined border
  borderLight: "#F2F2F2", // even subtler dividers

  // Brand
  blue: "#185FA5",
  blueBg: "#EEF5FC", // lighter, cleaner blue tint
  blueMid: "#378ADD",

  // Semantic
  green: "#3B6D11",
  greenBg: "#F0F7E6", // lighter green tint
  amber: "#854F0B",
  amberBg: "#FDF3E3", // lighter amber tint
  red: "#A32D2D",
  redBg: "#FEF1F1", // lighter red tint

  // Text
  textPrimary: "#1A1A1A", // near black, softer than pure black
  textSecondary: "#6B6B6B", // medium gray
  textTertiary: "#A0A0A0", // light gray for hints/placeholders
  textInverse: "#FFFFFF",
};
```

### 5. Global style updates

Create `constants/globalStyles.ts`:

```typescript
import {StyleSheet} from "react-native";
import {Colors} from "./colors";
import {Typography} from "./typography";

export const GlobalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: Typography.xs,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    letterSpacing: Typography.wider_tracking,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  navTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  bodyText: {
    fontSize: Typography.base,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.normal,
  },
  mutedText: {
    fontSize: Typography.sm,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
});
```

### 6. Apply across all screens and components

Update every file that has `backgroundColor` set to a gray/surface
color. Specifically:

For each of these files, find all StyleSheet entries with
backgroundColor and apply the white-first system:

- `app/(tabs)/index.tsx`
- `app/(tabs)/recipes.tsx`
- `app/(tabs)/search.tsx`
- `app/(tabs)/profile.tsx`
- `app/location/[id].tsx`
- `app/item/[id].tsx`
- `app/item/add.tsx`
- `app/item/edit.tsx`
- `app/analytics.tsx`
- `app/auth/sign-in.tsx`
- `app/auth/create-account.tsx`
- `app/auth/create-household.tsx`
- `components/ItemRow.tsx`
- `components/LocationCard.tsx`
- `components/ExpiryPill.tsx`
- `components/StatCard.tsx`

Rules for each file:

- Screen containers: `backgroundColor: Colors.background` (white)
- Cards: `backgroundColor: Colors.white, borderColor: Colors.border,
borderWidth: 0.5`
- Section headers: use GlobalStyles.sectionHeader pattern
- All text: replace hardcoded colors with Colors.textPrimary/
  Secondary/Tertiary
- All fontFamily: replace any existing fontFamily or add
  fontFamily: Typography.regular (or medium/semibold where
  appropriate for weight)
- Headings/titles: Typography.semibold or Typography.bold
- Body text: Typography.regular
- Remove any backgroundColor from ScrollView containers —
  they should be transparent

### Notes

- Do NOT change any layout, padding, or margin values —
  this task is colors and typography only
- Do NOT change any functional logic
- Install expo-splash-screen if not already installed:
  `npx expo install expo-splash-screen`
- After all changes run `npx tsc --noEmit` and fix errors
- Suggest a git commit message when done
