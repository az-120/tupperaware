import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../constants/colors";
import { LocationWithItems } from "../hooks/useLocations";
import { daysUntilExpiry } from "../lib/expiry";
import { ItemCategory } from "../types";

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Dairy: "🥛",
  Produce: "🥦",
  Meat: "🥩",
  Frozen: "❄️",
  Pantry: "🥫",
  Other: "📦",
};

interface LocationCardProps {
  location: LocationWithItems;
}

function chipStyle(days: number): { bg: string; fg: string } {
  if (days < 0 || days <= 2) return { bg: Colors.redBg, fg: Colors.red };
  if (days <= 5) return { bg: Colors.amberBg, fg: Colors.amber };
  return { bg: Colors.greenBg, fg: Colors.green };
}

export function LocationCard({ location }: LocationCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/location/${location.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{location.icon}</Text>
        <Text style={styles.name}>{location.name}</Text>
        <Text style={styles.count}>{location.items.length} items</Text>
      </View>

      {location.items.length > 0 && (
        <View style={styles.chips}>
          {location.items.slice(0, 4).map((item) => {
            const days = daysUntilExpiry(item.expiry_date);
            const { bg, fg } = chipStyle(days);
            const expiryLabel = days < 0 ? "Expired" : `${days}d`;
            const itemEmoji = item.emoji || CATEGORY_EMOJI[item.category];
            return (
              <View key={item.id} style={[styles.chip, { backgroundColor: bg }]}>
                <Text style={[styles.chipEmoji, { color: fg }]}>{itemEmoji}</Text>
                <Text style={[styles.chipName, { color: fg }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.chipExpiry, { color: fg }]}>{expiryLabel}</Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  count: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    maxWidth: "47%",
  },
  chipEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  chipName: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },
  chipExpiry: {
    fontSize: 11,
    fontWeight: "600",
  },
});
