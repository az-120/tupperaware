import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useHousehold } from "../../hooks/useHousehold";
import { ItemRow } from "../../components/ItemRow";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Item } from "../../types";

interface ItemWithLocation extends Item {
  locations: { name: string; household_id: string } | null;
}

export default function SearchScreen() {
  const { household, loading: householdLoading } = useHousehold();

  const [allItems, setAllItems] = useState<ItemWithLocation[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!household) return;

    setLoading(true);

    const session = (await supabase.auth.getSession()).data.session;

    const params = new URLSearchParams({
      select: "*,locations(name,household_id)",
      status: "eq.active",
      "locations.household_id": `eq.${household.id}`,
      order: "name.asc",
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

    if (res.ok) {
      const data = (await res.json()) as ItemWithLocation[];
      setAllItems(data.filter((i) => i.locations?.household_id === household.id));
    }

    setLoading(false);
  }, [household]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setQuery("");
    await fetchItems();
    setRefreshing(false);
  };

  const filteredItems =
    query.length === 0
      ? allItems
      : allItems.filter(
          (i) =>
            i.name.toLowerCase().includes(query.toLowerCase()) ||
            i.category.toLowerCase().includes(query.toLowerCase()),
        );

  const isFiltering = query.length > 0;
  const countLabel = isFiltering
    ? `${filteredItems.length} of ${allItems.length} items`
    : `${allItems.length} items`;

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
        <Text style={styles.navTitle}>Search</Text>
        <View style={styles.inputRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search your inventory..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {allItems.length > 0 && (
          <Text style={styles.countLabel}>{countLabel}</Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.blue}
          />
        }
      >
        {query.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>Search your inventory</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items found for "{query}"</Text>
          </View>
        ) : (
          <View style={styles.results}>
            {filteredItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                locationName={item.locations?.name}
              />
            ))}
          </View>
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
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  navTitle: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  results: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
    marginTop: 16,
  },
  empty: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
