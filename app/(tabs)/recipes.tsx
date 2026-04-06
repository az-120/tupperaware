import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

export default function RecipesScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Recipes</Text>
      </View>
      <View style={styles.centered}>
        <Text style={styles.emoji}>🍳</Text>
        <Text style={styles.message}>Recipes coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 17,
    color: Colors.textSecondary,
  },
});
