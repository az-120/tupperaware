import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { validateLocations } from "../lib/validators";
import { Item, Location } from "../types";

export interface LocationWithItems extends Location {
  items: Item[];
}

interface UseLocationsResult {
  locations: LocationWithItems[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLocations(householdId: string | null): UseLocationsResult {
  const [locations, setLocations] = useState<LocationWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!householdId) {
      setLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const headers = {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    };

    const locRes = await fetch(
      `${baseUrl}/rest/v1/locations?household_id=eq.${householdId}&order=created_at.asc`,
      { headers },
    );

    if (!locRes.ok) {
      setError(`Failed to fetch locations (${locRes.status})`);
      setLoading(false);
      return;
    }

    const locsJson = await locRes.json();
    const locValidation = validateLocations(locsJson);
    if (__DEV__ && !locValidation.valid) {
      console.warn("[useLocations] validation errors:", locValidation.errors);
    }
    const locs = locsJson as Location[];

    const locationsWithItems = await Promise.all(
      locs.map(async (loc) => {
        const itemsRes = await fetch(
          `${baseUrl}/rest/v1/items?location_id=eq.${loc.id}&status=eq.active&order=expiry_date.asc`,
          { headers },
        );
        const items = itemsRes.ok ? ((await itemsRes.json()) as Item[]) : [];
        return { ...loc, items };
      }),
    );

    setLocations(locationsWithItems);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return { locations, loading, error, refresh: fetchLocations };
}
