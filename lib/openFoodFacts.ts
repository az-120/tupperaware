import { ItemCategory } from "../types";

interface OpenFoodFactsProduct {
  product_name?: string;
  categories_tags?: string[];
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

const CATEGORY_MAP: Record<string, ItemCategory> = {
  "en:dairy": "Dairy",
  "en:dairies": "Dairy",
  "en:fresh-foods": "Produce",
  "en:fruits": "Produce",
  "en:vegetables": "Produce",
  "en:produce": "Produce",
  "en:meats": "Meat",
  "en:meat": "Meat",
  "en:frozen-foods": "Frozen",
  "en:frozen": "Frozen",
  "en:pantry": "Pantry",
  "en:cereals-and-potatoes": "Pantry",
};

function mapCategory(tags: string[] | undefined): ItemCategory {
  if (!tags) return "Other";
  for (const tag of tags) {
    const mapped = CATEGORY_MAP[tag.toLowerCase()];
    if (mapped) return mapped;
  }
  return "Other";
}

export async function lookupBarcode(
  barcode: string,
): Promise<{ name: string; category: ItemCategory } | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );
    if (!response.ok) return null;

    const data: OpenFoodFactsResponse = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const name = data.product.product_name?.trim();
    if (!name) return null;

    return {
      name,
      category: mapCategory(data.product.categories_tags),
    };
  } catch {
    return null;
  }
}
