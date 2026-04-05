import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Item } from "../types";
import { ExpiryPill } from "./ExpiryPill";
import { Colors } from "../constants/colors";

interface ItemRowProps {
  item: Item;
  locationName?: string;
}

export function ItemRow({ item, locationName }: ItemRowProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/item/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
