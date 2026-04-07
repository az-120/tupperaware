import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { validateItems } from "../lib/validators";
import { Item } from "../types";

interface UseItemsResult {
  items: Item[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useItems(locationId: string): UseItemsResult {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?location_id=eq.${locationId}&status=eq.active&order=expiry_date.asc`;

    const res = await fetch(url, {
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (!res.ok) {
      setError(`Failed to fetch items (${res.status})`);
      setLoading(false);
      return;
    }

    const json = await res.json();
    const result = validateItems(json);
    if (__DEV__ && !result.valid) {
      console.warn("[useItems] validation errors:", result.errors);
    }
    setItems(json as Item[]);
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
}
