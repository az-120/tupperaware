import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { Household, Location } from "../types";

interface HouseholdContextValue {
  household: Household | null;
  locations: Location[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextValue>({
  household: null,
  locations: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useHousehold(): HouseholdContextValue {
  return useContext(HouseholdContext);
}

export function useHouseholdProvider(): HouseholdContextValue {
  const { session } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    if (!session) {
      setHousehold(null);
      setLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: memberRow, error: memberError } = await supabase
      .from("household_members")
      .select("household_id, households(id, name, created_at)")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    if (!memberRow) {
      setHousehold(null);
      setLocations([]);
      setLoading(false);
      return;
    }

    const fetchedHousehold = memberRow.households as unknown as Household;
    setHousehold(fetchedHousehold);

    const { data: locationRows, error: locationError } = await supabase
      .from("locations")
      .select("*")
      .eq("household_id", fetchedHousehold.id);

    if (locationError) {
      setError(locationError.message);
    } else {
      setLocations((locationRows as Location[]) ?? []);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  return { household, locations, loading, error, refresh: fetchHousehold };
}
