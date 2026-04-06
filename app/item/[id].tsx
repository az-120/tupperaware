import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ExpiryPill } from "../../components/ExpiryPill";
import { daysUntilExpiry, getExpiryStatus } from "../../lib/expiry";
import { supabase } from "../../lib/supabase";
import { scheduleAllExpiryNotifications } from "../../lib/notifications";
import { Colors } from "../../constants/colors";
import { Item, ItemCategory, Location } from "../../types";

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Dairy: "🥛",
  Produce: "🥦",
  Meat: "🥩",
  Frozen: "❄️",
  Pantry: "🥫",
  Other: "📦",
};

const STATUS_COLOR: Record<string, string> = {
  expired: Colors.red,
  critical: Colors.red,
  warning: Colors.amber,
  fresh: Colors.green,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function freshnessPercent(createdAt: string, expiryDate: string): number {
  const added = new Date(createdAt).getTime();
  const expiry = new Date(expiryDate + "T12:00:00").getTime();
  const now = Date.now();
  const total = expiry - added;
  if (total <= 0) return 0;
  const remaining = expiry - now;
  return Math.min(100, Math.max(0, (remaining / total) * 100));
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) fetchItem(id);
  }, [id]);

  const getHeaders = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    return {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  };

  const fetchItem = async (itemId: string) => {
    setLoading(true);
    setError(null);

    const headers = await getHeaders();
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL!;

    const itemRes = await fetch(
      `${base}/rest/v1/items?id=eq.${itemId}&limit=1`,
      { headers },
    );

    if (!itemRes.ok) {
      setError("Failed to load item.");
      setLoading(false);
      return;
    }

    const items = (await itemRes.json()) as Item[];
    const fetchedItem = items[0] ?? null;
    setItem(fetchedItem);

    if (fetchedItem) {
      const locRes = await fetch(
        `${base}/rest/v1/locations?id=eq.${fetchedItem.location_id}&limit=1`,
        { headers },
      );
      if (locRes.ok) {
        const locs = (await locRes.json()) as Location[];
        setLocation(locs[0] ?? null);
      }
    }

    setLoading(false);
  };

  const updateStatus = async (status: "used" | "discarded") => {
    if (!id) return;
    setUpdating(true);
    setError(null);

    const headers = await getHeaders();
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL!;

    const res = await fetch(
      `${base}/rest/v1/items?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ status }),
      },
    );

    setUpdating(false);

    if (!res.ok) {
      const body = await res.text();
      setError(`Update failed: ${body}`);
      return;
    }

    // Reschedule notifications excluding the now-inactive item
    if (item) {
      const activeRes = await fetch(
        `${base}/rest/v1/items?location_id=eq.${item.location_id}&status=eq.active&id=neq.${id}`,
        { headers },
      );
      if (activeRes.ok) {
        const remaining = (await activeRes.json()) as Item[];
        await scheduleAllExpiryNotifications(remaining);
      }
    }

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Item not found."}</Text>
      </View>
    );
  }

  const status = getExpiryStatus(item.expiry_date);
  const barColor = STATUS_COLOR[status];
  const percent = freshnessPercent(item.created_at, item.expiry_date);

  return (
    <View style={styles.screen}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push(`/item/edit?id=${id}` as Parameters<typeof router.push>[0])}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
          <Text style={styles.itemName}>{item.name}</Text>
          {location && (
            <Text style={styles.locationSubtitle}>
              {location.icon}  {location.name}
            </Text>
          )}
        </View>

        {/* Freshness bar */}
        <View style={styles.freshnessSection}>
          <View style={styles.barRow}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${percent}%` as `${number}%`, backgroundColor: barColor }]} />
            </View>
            <ExpiryPill expiryDate={item.expiry_date} />
          </View>
          <Text style={styles.freshnessLabel}>
            {daysUntilExpiry(item.expiry_date) >= 0
              ? `${Math.round(percent)}% shelf life remaining`
              : "Shelf life expired"}
          </Text>
        </View>

        {/* Metadata */}
        <View style={styles.metaCard}>
          <MetaRow label="Quantity" value={item.quantity || "—"} />
          <MetaRow label="Category" value={item.category} />
          <MetaRow label="Location" value={location ? `${location.icon} ${location.name}` : "—"} />
          <MetaRow label="Date added" value={formatDate(item.created_at)} />
          <MetaRow label="Expiry date" value={formatDate(item.expiry_date + "T12:00:00")} />
          <MetaRow label="Barcode" value={item.barcode ?? "Not scanned"} last />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.usedBtn]}
            onPress={() => updateStatus("used")}
            disabled={updating}
          >
            <Text style={styles.actionText}>{updating ? "Updating…" : "Mark as used"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.discardBtn]}
            onPress={() => updateStatus("discarded")}
            disabled={updating}
          >
            <Text style={styles.actionText}>{updating ? "Updating…" : "Discard item"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
  errorText: {
    color: Colors.textSecondary,
    fontSize: 15,
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
  editText: {
    fontSize: 17,
    color: Colors.blue,
    textAlign: "right",
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
  },
  categoryEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  freshnessSection: {
    marginBottom: 20,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  freshnessLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  metaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  error: {
    color: Colors.red,
    fontSize: 14,
    marginBottom: 16,
  },
  actions: {
    gap: 12,
  },
  actionBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  usedBtn: {
    backgroundColor: Colors.green,
  },
  discardBtn: {
    backgroundColor: Colors.red,
  },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
