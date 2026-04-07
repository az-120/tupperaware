import { Item } from "../types";

export interface Recipe {
  name: string;
  emoji: string;
  usesItems: string[];
  urgentItems: string[];
  description: string;
  cookTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

function formatItems(items: Item[]): string {
  if (items.length === 0) return "(none)";
  return items.map((i) => `- ${i.name} (${i.quantity || "1"})`).join("\n");
}

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchRecipeSuggestions(
  urgent: Item[],
  soon: Item[],
  fresh: Item[],
): Promise<Recipe[]> {
  const prompt = `You are a helpful cooking assistant. Suggest recipes based on available ingredients, prioritizing items that expire soonest.

URGENT - expires in 1-2 days:
${formatItems(urgent)}

EXPIRING SOON - expires in 3-5 days:
${formatItems(soon)}

IN STOCK - 6+ days remaining:
${formatItems(fresh)}

Rules:
- Prioritize using URGENT and EXPIRING SOON items first
- Each recipe must use at least one item from the list
- Common pantry staples (salt, pepper, oil, basic spices) are always available and can be assumed
- Suggest exactly 3 recipes (or fewer if very limited ingredients)
- Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"name": string, "emoji": string, "usesItems": string[], "urgentItems": string[], "description": string (2 sentences max), "cookTime": string, "difficulty": "Easy" | "Medium" | "Hard"}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    content: { type: string; text: string }[];
  };

  const text = data.content[0]?.text;
  if (!text) {
    throw new Error("Empty response from Anthropic API");
  }

  if (__DEV__) {
    console.log("[anthropic] prompt length:", prompt.length, "chars");
    console.log("[anthropic] raw response:", text.slice(0, 200));
  }

  const recipes = parseRecipeResponse(text);
  if (__DEV__) console.log("[anthropic] parsed recipes:", recipes.length);
  return recipes;
}

function parseRecipeResponse(text: string): Recipe[] {
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();

  let recipes: Recipe[];
  try {
    recipes = JSON.parse(cleaned) as Recipe[];
  } catch {
    throw new Error(`Failed to parse recipe response: ${cleaned.slice(0, 200)}`);
  }

  if (!Array.isArray(recipes)) {
    throw new Error("Recipe response is not an array");
  }

  return recipes;
}

export async function fetchRecipesForSelectedItems(
  selectedItems: Item[],
): Promise<Recipe[]> {
  const itemsList = selectedItems
    .map((i) => {
      const d = daysFromNow(i.expiry_date);
      return `- ${i.name} (expires in ${d} days)`;
    })
    .join("\n");

  const prompt = `You are a helpful cooking assistant. The user wants to cook using these specific ingredients:
${itemsList}

Common pantry staples (salt, pepper, oil, basic spices) are always available.

Rules:
- Suggest exactly 3 recipes using ONLY the listed ingredients plus pantry staples
- Do not suggest recipes requiring unlisted ingredients
- Respond ONLY with a valid JSON array, no markdown:
[{"name": string, "emoji": string, "usesItems": string[], "urgentItems": string[], "description": string (2 sentences max), "cookTime": string, "difficulty": "Easy" | "Medium" | "Hard"}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    content: { type: string; text: string }[];
  };

  const text = data.content[0]?.text;
  if (!text) {
    throw new Error("Empty response from Anthropic API");
  }

  if (__DEV__) {
    console.log("[anthropic] prompt length:", prompt.length, "chars");
    console.log("[anthropic] raw response:", text.slice(0, 200));
  }

  const recipes = parseRecipeResponse(text);
  if (__DEV__) console.log("[anthropic] parsed recipes:", recipes.length);
  return recipes;
}
