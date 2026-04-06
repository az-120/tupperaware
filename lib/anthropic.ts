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

  // Strip markdown fences if present
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
