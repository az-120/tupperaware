import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import { supabase } from "../lib/supabase";
import {
  computeSummary,
  computeCategoryWaste,
  computeLocationWaste,
  computeMonthlyTrend,
  AnalyticsSummary,
  CategoryWaste,
  LocationWaste,
  MonthlyTrend,
} from "../lib/analytics";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Item, Location } from "../types";

function wasteColor(rate: number): string {
  if (rate < 20) return Colors.green;
  if (rate <= 40) return Colors.amber;
  return Colors.red;
}

function wasteBg(rate: number): string {
  if (rate < 20) return Colors.greenBg;
  if (rate <= 40) return Colors.amberBg;
  return Colors.redBg;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { household } = useHousehold();

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const headers = {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    };

    // Fetch all locations for this household
    const locRes = await fetch(
      `${base}/rest/v1/locations?household_id=eq.${household.id}&order=created_at.asc`,
      { headers },
    );

    let fetchedLocations: Location[] = [];
    if (locRes.ok) {
      fetchedLocations = (await locRes.json()) as Location[];
      setLocations(fetchedLocations);
    }

    // Fetch ALL items (no status filter) across all locations
    const locationIds = fetchedLocations.map((l) => `"${l.id}"`).join(",");
    if (!locationIds) {
      setLoading(false);
      return;
    }

    const itemsRes = await fetch(
      `${base}/rest/v1/items?location_id=in.(${locationIds})&order=updated_at.desc`,
      { headers },
    );

    if (!itemsRes.ok) {
      setError("Failed to load analytics data.");
      setLoading(false);
      return;
    }

    setItems((await itemsRes.json()) as Item[]);
    setLoading(false);
  }, [household]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary: AnalyticsSummary = useMemo(() => computeSummary(items), [items]);
  const categoryWaste: CategoryWaste[] = useMemo(() => computeCategoryWaste(items), [items]);
  const locationWaste: LocationWaste[] = useMemo(
    () => computeLocationWaste(items, locations),
    [items, locations],
  );
  const monthlyTrend: MonthlyTrend[] = useMemo(() => computeMonthlyTrend(items), [items]);

  const joinedMonth = household?.created_at
    ? new Date(household.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  const maxMonthlyTotal = Math.max(
    ...monthlyTrend.map((m) => m.used + m.discarded),
    1,
  );

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Waste tracker</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {joinedMonth ? `Since ${joinedMonth}` : "All time"}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Summary stat cards */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.totalConsumed}</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.green }]}>{summary.totalUsed}</Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.red }]}>{summary.totalDiscarded}</Text>
            <Text style={styles.statLabel}>Discarded</Text>
          </View>
        </View>

        {/* Waste rate card */}
        <View style={[styles.wasteRateCard, { backgroundColor: wasteBg(summary.wasteRate) }]}>
          {summary.totalConsumed === 0 ? (
            <Text style={styles.noDataText}>
              No data yet — start marking items as used or discarded
            </Text>
          ) : (
            <>
              <Text style={[styles.wasteRateNumber, { color: wasteColor(summary.wasteRate) }]}>
                {Math.round(summary.wasteRate)}%
              </Text>
              <Text style={[styles.wasteRateLabel, { color: wasteColor(summary.wasteRate) }]}>
                of your food was wasted
              </Text>
            </>
          )}
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionHeader}>Waste by category</Text>
        {categoryWaste.length === 0 ? (
          <Text style={styles.emptyText}>No category data yet</Text>
        ) : (
          <View style={styles.barSection}>
            {categoryWaste.map((row) => (
              <View key={row.category} style={styles.barRow}>
                <Text style={styles.barLabel}>
                  {row.emoji} {row.category}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(row.wasteRate)}%` as `${number}%`,
                        backgroundColor: wasteColor(row.wasteRate),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barPct, { color: wasteColor(row.wasteRate) }]}>
                  {Math.round(row.wasteRate)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Location breakdown */}
        <Text style={styles.sectionHeader}>Waste by location</Text>
        {locationWaste.length === 0 ? (
          <Text style={styles.emptyText}>No location data yet</Text>
        ) : (
          <View style={styles.barSection}>
            {locationWaste.map((row) => (
              <View key={row.locationId} style={styles.barRow}>
                <Text style={styles.barLabel}>
                  {row.locationIcon} {row.locationName}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(row.wasteRate)}%` as `${number}%`,
                        backgroundColor: wasteColor(row.wasteRate),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barPct, { color: wasteColor(row.wasteRate) }]}>
                  {Math.round(row.wasteRate)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Monthly trend */}
        <Text style={styles.sectionHeader}>Monthly trend (last 6 months)</Text>
        <View style={styles.barSection}>
          {monthlyTrend.map((row) => {
            const total = row.used + row.discarded;
            const usedWidth = total === 0 ? 0 : (row.used / maxMonthlyTotal) * 100;
            const discardedWidth = total === 0 ? 0 : (row.discarded / maxMonthlyTotal) * 100;
            const monthShort = row.month.split(" ")[0];
            return (
              <View key={row.month} style={styles.trendRow}>
                <Text style={styles.trendLabel}>{monthShort}</Text>
                <View style={styles.trendBars}>
                  <View
                    style={[
                      styles.trendBar,
                      styles.trendBarUsed,
                      { width: `${usedWidth}%` as `${number}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.trendBar,
                      styles.trendBarDiscarded,
                      { width: `${discardedWidth}%` as `${number}%` },
                    ]}
                  />
                </View>
                <Text style={styles.trendTotal}>{total > 0 ? total : "—"}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
            <Text style={styles.legendText}>Used</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
            <Text style={styles.legendText}>Discarded</Text>
          </View>
        </View>
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
  navBtn: {
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Typography.regular,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  wasteRateCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  wasteRateNumber: {
    fontSize: 56,
    fontFamily: Typography.bold,
    marginBottom: 4,
  },
  wasteRateLabel: {
    fontSize: 15,
    fontFamily: Typography.medium,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  barSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 24,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    width: 100,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.borderLight,
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
    minWidth: 2,
  },
  barPct: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    width: 36,
    textAlign: "right",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trendLabel: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    width: 30,
  },
  trendBars: {
    flex: 1,
    gap: 3,
  },
  trendBar: {
    height: 8,
    borderRadius: 4,
    minWidth: 2,
  },
  trendBarUsed: {
    backgroundColor: Colors.green,
  },
  trendBarDiscarded: {
    backgroundColor: Colors.red,
  },
  trendTotal: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    width: 24,
    textAlign: "right",
  },
  legend: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
});
