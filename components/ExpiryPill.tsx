import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { daysUntilExpiry } from "../lib/expiry";

interface ExpiryPillProps {
  expiryDate: string;
}

export function ExpiryPill({ expiryDate }: ExpiryPillProps) {
  const days = daysUntilExpiry(expiryDate);

  let bg: string;
  let fg: string;
  let label: string;

  if (days < 0) {
    bg = Colors.redBg;
    fg = Colors.red;
    label = "Expired";
  } else if (days <= 2) {
    bg = Colors.redBg;
    fg = Colors.red;
    label = days === 1 ? "1 day" : `${days} days`;
  } else if (days <= 5) {
    bg = Colors.amberBg;
    fg = Colors.amber;
    label = `${days} days`;
  } else {
    bg = Colors.greenBg;
    fg = Colors.green;
    label = `${days} days`;
  }

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
