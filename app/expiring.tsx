import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import { ItemRow } from "../components/ItemRow";
import { daysUntilExpiry } from "../lib/expiry";
import { supabase } from "../lib/supabase";
import { Colors } from "../constants/colors";
import { Item } from "../types";

interface ItemWithLocation extends Item {
  locations: { name: string; household_id: string } | null;
}

export default function ExpiringScreen() {
  const router = useRouter();
  const { household, loading: householdLoading } = useHousehold();

  const [items, setItems] = useState<ItemWithLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpiring = useCallback(async () => {
    if (!household) return;

    setLoading(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 5);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const params = new URLSearchParams({
      select: "*,locations(name,household_id)",
      status: "eq.active",
      expiry_date: `lte.${cutoffStr}`,
      "locations.household_id": `eq.${household.id}`,
      order: "expiry_date.asc",
    });

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?${params.toString()}`,
      {
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      },
    );

    if (!res.ok) {
      setError("Failed to load expiring items.");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ItemWithLocation[];
    setItems(data.filter((i) => i.locations?.household_id === household.id));
    setLoading(false);
  }, [household]);

  useEffect(() => {
    fetchExpiring();
  }, [fetchExpiring]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExpiring();
    setRefreshing(false);
  };

  const expired = items.filter((i) => daysUntilExpiry(i.expiry_date) < 0);
  const expiringSoon = items.filter((i) => daysUntilExpiry(i.expiry_date) >= 0);
  const total = items.length;

  if (householdLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as Parameters<typeof router.replace>[0]);
            }
          }}
          style={styles.navBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Expiring items</Text>
        <View style={styles.navBtn} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.blue}
          />
        }
      >
        {total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>
              Nothing expiring soon — you're all good!
            </Text>
          </View>
        ) : (
          <>
            {expired.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Expired</Text>
                <View style={styles.sectionList}>
                  {expired.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </View>
              </View>
            )}

            {expiringSoon.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Expiring soon</Text>
                <View style={styles.sectionList}>
                  {expiringSoon.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBtn: {
    minWidth: 56,
  },
  backText: {
    fontSize: 17,
    color: Colors.blue,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  errorBanner: {
    backgroundColor: Colors.redBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
});
