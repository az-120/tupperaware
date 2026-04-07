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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useItems } from "../../hooks/useItems";
import { ItemRow } from "../../components/ItemRow";
import { daysUntilExpiry } from "../../lib/expiry";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { supabase } from "../../lib/supabase";
import { Item, ItemCategory, Location } from "../../types";

type FilterTab = "all" | "expiring" | "category";

const CATEGORIES: ItemCategory[] = ["Dairy", "Produce", "Meat", "Frozen", "Pantry", "Other"];

export default function LocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { items, loading: itemsLoading, refresh: refreshItems } = useItems(id ?? "");

  useEffect(() => {
    if (id) fetchLocation(id);
  }, [id]);

  const fetchLocation = async (locationId: string) => {
    setLocationLoading(true);
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/locations?id=eq.${locationId}&limit=1`,
      {
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      },
    );
    if (res.ok) {
      const data = (await res.json()) as Location[];
      setLocation(data[0] ?? null);
    }
    setLocationLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLocation(id ?? ""), refreshItems()]);
    setRefreshing(false);
  };

  const getFilteredItems = (): { sections: { title: string; data: Item[] }[] } | { flat: Item[] } => {
    if (activeTab === "category") {
      const sections = CATEGORIES.flatMap((cat) => {
        const data = items.filter((i) => i.category === cat);
        return data.length > 0 ? [{ title: cat, data }] : [];
      });
      return { sections };
    }

    const filtered =
      activeTab === "expiring"
        ? items.filter((i) => {
            const d = daysUntilExpiry(i.expiry_date);
            return d >= 0 && d <= 5;
          })
        : items;

    const expiringSoon = filtered.filter((i) => daysUntilExpiry(i.expiry_date) <= 5);
    const freshItems = filtered.filter((i) => daysUntilExpiry(i.expiry_date) > 5);

    const sections: { title: string; data: Item[] }[] = [];
    if (expiringSoon.length > 0) sections.push({ title: "Expiring soon", data: expiringSoon });
    if (freshItems.length > 0) sections.push({ title: "Fresh", data: freshItems });

    return { sections };
  };

  if (locationLoading || itemsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  const result = getFilteredItems();
  const sections = "sections" in result ? result.sections : [];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {location?.icon ? `${location.icon}  ` : ""}
          {location?.name ?? "Location"}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/item/add?location_id=${id}` as Parameters<typeof router.push>[0],
            )
          }
          style={styles.addBtn}
        >
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentRow}>
        {(["all", "expiring", "category"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && styles.segmentActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
              {tab === "all" ? "All" : tab === "expiring" ? "Expiring" : "Category"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.blue} />
        }
      >
        {sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet — tap + Add to get started</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <View style={styles.sectionList}>
                {section.data.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    minWidth: 56,
  },
  backText: {
    fontSize: 17,
    fontFamily: Typography.regular,
    color: Colors.blue,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  addBtn: {
    minWidth: 56,
    alignItems: "flex-end",
  },
  addText: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.blue,
  },
  segmentRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.white,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontFamily: Typography.semibold,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionList: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  empty: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: Typography.regular,
    textAlign: "center",
    lineHeight: 22,
  },
});
