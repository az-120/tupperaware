import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { Colors } from "../../constants/colors";

function initials(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase();
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function comingSoon() {
  Alert.alert("Coming soon", "This feature isn't available yet.");
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { household, locations } = useHousehold();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/sign-in");
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Nav title */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Profile</Text>
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email ? initials(user.email) : "?"}
            </Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.email}>{user?.email ?? "—"}</Text>
            {user?.created_at && (
              <Text style={styles.memberSince}>
                Member since {formatMemberSince(user.created_at)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Household */}
      <Text style={styles.sectionLabel}>Household</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowLabel}>🏠  {household?.name ?? "—"}</Text>
        </View>

        {locations.map((loc, index) => (
          <View
            key={loc.id}
            style={[styles.row, index < locations.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>
              {loc.icon}  {loc.name}
            </Text>
          </View>
        ))}

        <View style={[styles.row, styles.rowTop]}>
          <TouchableOpacity style={styles.rowInner} onPress={comingSoon}>
            <Text style={[styles.rowLabel, styles.rowAction]}>+ Invite member</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App */}
      <Text style={styles.sectionLabel}>App</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={comingSoon}>
          <View style={styles.rowInner}>
            <Text style={styles.rowLabel}>Notification settings</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={comingSoon}>
          <View style={styles.rowInner}>
            <Text style={styles.rowLabel}>Rate TupperAware</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Danger zone */}
      <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger zone</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    paddingBottom: 48,
  },
  navBar: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 24,
  },
  navTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  dangerLabel: {
    color: Colors.red,
    marginTop: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  accountInfo: {
    flex: 1,
  },
  email: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowAction: {
    color: Colors.blue,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.red,
    textAlign: "center",
  },
});
