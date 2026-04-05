import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: color ?? Colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
