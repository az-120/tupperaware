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

Task 2 of 3: Build the Anthropic API utility and smart suggestions
mode on the recipes tab.

### 1. Utility: `lib/anthropic.ts`

Create a utility for calling the Anthropic API:

```typescript
export interface Recipe {
  name: string;
  emoji: string;
  usesItems: string[];
  urgentItems: string[];
  description: string;
  cookTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
}
```

Export an async function `fetchRecipeSuggestions`:

```typescript
export async function fetchRecipeSuggestions(
  urgent: Item[], // expiry ≤ 2 days
  soon: Item[], // expiry 3-5 days
  fresh: Item[], // expiry 6+ days
): Promise;
```

The function should:

- Build a prompt using the three weighted item tiers:

```text
You are a helpful cooking assistant. Suggest recipes based on
available ingredients, prioritizing items that expire soonest.
URGENT - expires in 1-2 days:
${urgent items or '(none)'}
EXPIRING SOON - expires in 3-5 days:
${soon items or '(none)'}
IN STOCK - 6+ days remaining:
${fresh items or '(none)'}
Rules:

Prioritize using URGENT and EXPIRING SOON items first
Each recipe must use at least one item from the list
Common pantry staples (salt, pepper, oil, basic spices) are
always available and can be assumed
Suggest exactly 3 recipes (or fewer if very limited ingredients)
Respond ONLY with a valid JSON array, no markdown, no explanation:
[{
"name": string,
"emoji": string,
"usesItems": string[],
"urgentItems": string[],
"description": string (2 sentences max),
"cookTime": string,
"difficulty": "Easy" | "Medium" | "Hard"
}]
```

- Call the Anthropic API:

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{role: "user", content: prompt}],
  }),
});
```

- Parse the response: extract text from
  `data.content[0].text`, strip any markdown fences,
  parse as JSON array
- Return parsed Recipe[] array
- On any error (network, parse, API error) throw with
  a descriptive message

### 2. Unit tests: `__tests__/anthropic.test.ts`

Write tests for lib/anthropic.ts:

- Mock global fetch
- Test successful response returns parsed Recipe array
- Test malformed JSON response throws error
- Test network error throws error
- Test empty inventory returns recipes array
- Verify correct headers are sent in the request
- Verify model is claude-sonnet-4-20250514

### 3. Screen: `app/(tabs)/recipes.tsx` — smart mode only

Replace the placeholder with the full smart suggestions screen.
For now implement smart mode only (pick mode comes in Task 3).

Layout:

- Screen title "Recipes" in nav bar
- Uses useAuth and useHousehold to get household
- Uses useItems-style raw fetch to get ALL active items
  across all household locations (same query as search screen)
- Splits items into three tiers using getExpiryStatus from
  types/index.ts:
  - urgent: status === 'critical' or 'expired'
  - soon: status === 'warning'
  - fresh: status === 'fresh'

Top section — inventory summary:

- Muted text showing e.g. "3 expiring soon · 12 total items"
- If 0 items total show empty state: "Add some items to your
  inventory to get recipe suggestions"

Segmented control:

- Two options: "Smart pick" and "I'll choose"
- For now "I'll choose" shows "Coming in next update" placeholder
- We will replace this in Task 3

Smart pick section:

- A card with:
  - Title "What can I cook tonight?"
  - Subtitle "Claude will prioritize your expiring items"
  - "Suggest recipes →" button
- Loading state: replace button with spinner +
  "Asking Claude..." text
- Error state: show error message in red with "Try again" button

Recipe cards (shown after generation):

- Each recipe in a card with:
  - Emoji + name on the same line, difficulty badge on the right
    (green=Easy, amber=Medium, red=Hard)
  - "Uses: item1 ⚠️, item2, item3" — ⚠️ on urgentItems only
  - Description text (muted, smaller)
  - Cook time with ⏱ icon at bottom
- Below all cards a "↺ Regenerate" text button
- Caching: store recipes in state with an itemsFingerprint
  (all active item IDs joined and sorted)
  Only re-fetch if fingerprint changes or user taps Regenerate

### Notes

- ANTHROPIC*API_KEY is in .env.local without EXPO_PUBLIC* prefix
- Use StyleSheet.create for all styles
- After all files written run `npm test` and `npx tsc --noEmit`
  fix all errors before committing
- Suggest a git commit message when done
