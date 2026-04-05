import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { useLocations } from "../../hooks/useLocations";
import { StatCard } from "../../components/StatCard";
import { LocationCard } from "../../components/LocationCard";
import { daysUntilExpiry } from "../../lib/expiry";
import { Colors } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const { locations, loading: locationsLoading, refresh } = useLocations(household?.id ?? null);

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!household) return;
    fetchMemberCount(household.id);
  }, [household]);

  const fetchMemberCount = async (householdId: string) => {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/household_members?household_id=eq.${householdId}&select=id`,
      {
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      },
    );
    if (res.ok) {
      const data = (await res.json()) as { id: string }[];
      setMemberCount(data.length);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (householdLoading || locationsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  const allItems = locations.flatMap((l) => l.items);
  const total = allItems.length;
  const expiringSoon = allItems.filter((i) => {
    const d = daysUntilExpiry(i.expiry_date);
    return d >= 0 && d <= 5;
  }).length;
  const fresh = allItems.filter((i) => daysUntilExpiry(i.expiry_date) > 5).length;
  const critical = allItems.filter((i) => {
    const d = daysUntilExpiry(i.expiry_date);
    return d >= 0 && d <= 2;
  }).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.blue} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.householdName}>{household?.name ?? "My Household"}</Text>
          {memberCount !== null && (
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statRow}>
        <StatCard label="Total Items" value={total} />
        <StatCard label="Expiring Soon" value={expiringSoon} color={Colors.amber} />
        <StatCard label="Fresh" value={fresh} color={Colors.green} />
      </View>

      {critical > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            {critical} {critical === 1 ? "item expires" : "items expire"} within 2 days
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/expiring")}>
            <Text style={styles.alertLink}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {locations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No locations yet.</Text>
        </View>
      ) : (
        locations.map((loc) => <LocationCard key={loc.id} location={loc} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  header: {
    marginBottom: 20,
  },
  householdName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  memberCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  alertBanner: {
    backgroundColor: Colors.redBg,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  alertText: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  alertLink: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  empty: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
