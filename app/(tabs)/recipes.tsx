import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHousehold } from "../../hooks/useHousehold";
import { supabase } from "../../lib/supabase";
import { getExpiryStatus } from "../../lib/expiry";
import { fetchRecipeSuggestions, Recipe } from "../../lib/anthropic";
import { Colors } from "../../constants/colors";
import { Item } from "../../types";

type Mode = "smart" | "choose";

interface ItemWithLocation extends Item {
  locations: { name: string; household_id: string } | null;
}

const DIFFICULTY_COLORS: Record<string, { text: string; bg: string }> = {
  Easy: { text: Colors.green, bg: Colors.greenBg },
  Medium: { text: Colors.amber, bg: Colors.amberBg },
  Hard: { text: Colors.red, bg: Colors.redBg },
};

export default function RecipesScreen() {
  const { household, loading: householdLoading } = useHousehold();

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("smart");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const cachedFingerprintRef = useRef<string>("");

  const fetchAllItems = useCallback(async () => {
    if (!household) return;
    setItemsLoading(true);

    const session = (await supabase.auth.getSession()).data.session;
    const params = new URLSearchParams({
      select: "*,locations(name,household_id)",
      status: "eq.active",
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

    if (res.ok) {
      const data = (await res.json()) as ItemWithLocation[];
      setAllItems(data.filter((i) => i.locations?.household_id === household.id));
    }
    setItemsLoading(false);
  }, [household]);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const { urgent, soon, fresh } = useMemo(() => {
    const u: Item[] = [];
    const s: Item[] = [];
    const f: Item[] = [];
    for (const item of allItems) {
      const status = getExpiryStatus(item.expiry_date);
      if (status === "expired" || status === "critical") u.push(item);
      else if (status === "warning") s.push(item);
      else f.push(item);
    }
    return { urgent: u, soon: s, fresh: f };
  }, [allItems]);

  const itemsFingerprint = useMemo(
    () => allItems.map((i) => i.id).sort().join(","),
    [allItems],
  );

  const expiringSoonCount = urgent.length + soon.length;

  const handleGenerate = async (force = false) => {
    if (!force && cachedFingerprintRef.current === itemsFingerprint && recipes.length > 0) {
      return;
    }

    setGenerating(true);
    setGenError(null);

    try {
      const result = await fetchRecipeSuggestions(urgent, soon, fresh);
      setRecipes(result);
      cachedFingerprintRef.current = itemsFingerprint;
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  if (householdLoading || itemsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Recipes</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Inventory summary */}
        {allItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyText}>
              Add some items to your inventory to get recipe suggestions
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.summary}>
              {expiringSoonCount > 0
                ? `${expiringSoonCount} expiring soon · ${allItems.length} total items`
                : `${allItems.length} total items`}
            </Text>

            {/* Segmented control */}
            <View style={styles.segmentRow}>
              {(["smart", "choose"] as Mode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.segment, mode === m && styles.segmentActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                    {m === "smart" ? "Smart pick" : "I'll choose"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "choose" ? (
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonText}>Coming in next update</Text>
              </View>
            ) : (
              <>
                {/* Smart pick prompt card */}
                <View style={styles.promptCard}>
                  <Text style={styles.promptTitle}>What can I cook tonight?</Text>
                  <Text style={styles.promptSubtitle}>
                    Claude will prioritize your expiring items
                  </Text>

                  {generating ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color={Colors.blue} size="small" />
                      <Text style={styles.loadingText}>Asking Claude...</Text>
                    </View>
                  ) : genError ? (
                    <View style={styles.errorBlock}>
                      <Text style={styles.errorText}>{genError}</Text>
                      <TouchableOpacity onPress={() => handleGenerate(true)}>
                        <Text style={styles.tryAgainText}>Try again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.suggestBtn}
                      onPress={() => handleGenerate(false)}
                    >
                      <Text style={styles.suggestBtnText}>Suggest recipes →</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Recipe cards */}
                {recipes.map((recipe, idx) => {
                  const colors = DIFFICULTY_COLORS[recipe.difficulty] ?? DIFFICULTY_COLORS.Easy;
                  return (
                    <View key={idx} style={styles.recipeCard}>
                      <View style={styles.recipeHeader}>
                        <Text style={styles.recipeName}>
                          {recipe.emoji} {recipe.name}
                        </Text>
                        <View style={[styles.diffBadge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.diffText, { color: colors.text }]}>
                            {recipe.difficulty}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.usesLabel}>
                        Uses:{" "}
                        {recipe.usesItems.map((item, i) => (
                          <Text key={i}>
                            {i > 0 ? ", " : ""}
                            {item}
                            {recipe.urgentItems.includes(item) ? " ⚠️" : ""}
                          </Text>
                        ))}
                      </Text>

                      <Text style={styles.recipeDesc}>{recipe.description}</Text>

                      <Text style={styles.cookTime}>⏱ {recipe.cookTime}</Text>
                    </View>
                  );
                })}

                {recipes.length > 0 && (
                  <TouchableOpacity
                    style={styles.regenBtn}
                    onPress={() => handleGenerate(true)}
                  >
                    <Text style={styles.regenText}>↺ Regenerate</Text>
                  </TouchableOpacity>
                )}
              </>
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
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
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
  segmentRow: {
    flexDirection: "row",
    backgroundColor: Colors.border,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  comingSoon: {
    alignItems: "center",
    paddingTop: 60,
  },
  comingSoonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  promptCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  suggestBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  suggestBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorBlock: {
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    textAlign: "center",
  },
  tryAgainText: {
    color: Colors.blue,
    fontSize: 15,
    fontWeight: "600",
  },
  recipeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  recipeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  diffText: {
    fontSize: 12,
    fontWeight: "600",
  },
  usesLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  recipeDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  cookTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  regenBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  regenText: {
    fontSize: 15,
    color: Colors.blue,
    fontWeight: "500",
  },
});
