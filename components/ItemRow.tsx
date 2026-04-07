import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Item, ItemCategory } from "../types";
import { ExpiryPill } from "./ExpiryPill";
import { Colors } from "../constants/colors";

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Dairy: "🥛",
  Produce: "🥦",
  Meat: "🥩",
  Frozen: "❄️",
  Pantry: "🥫",
  Other: "📦",
};

interface ItemRowProps {
  item: Item;
  locationName?: string;
}

export function ItemRow({ item, locationName }: ItemRowProps) {
  const router = useRouter();
  const displayEmoji = item.emoji || CATEGORY_EMOJI[item.category];

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/item/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconChar}>{displayEmoji}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.partially_used && (
            <View style={styles.partialBadge}>
              <Text style={styles.partialBadgeText}>partial</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {item.category}
          {item.quantity ? `  ·  ${item.quantity}` : ""}
          {locationName ? `  ·  ${locationName}` : ""}
        </Text>
      </View>
      <ExpiryPill expiryDate={item.expiry_date} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconChar: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  partialBadge: {
    backgroundColor: Colors.amberBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  partialBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.amber,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
