import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.surface },
  label: { fontSize: 18, color: Colors.textPrimary },
});
