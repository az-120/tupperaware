import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import {useEffect, useState} from "react";
import {useRouter} from "expo-router";
import {useAuth} from "../../hooks/useAuth";
import {useHousehold} from "../../hooks/useHousehold";
import {supabase} from "../../lib/supabase";
import {Colors} from "../../constants/colors";

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
  const {user, signOut} = useAuth();
  const {household, locations} = useHousehold();
  const [memberCount, setMemberCount] = useState<number>(1);

  useEffect(() => {
    if (!household) return;
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/household_members?household_id=eq.${household.id}&select=id`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {id: string}[];
        setMemberCount(data.length);
      }
    })();
  }, [household?.id]);

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
        {/* Name + member count */}
        <View style={styles.householdHeader}>
          <Text style={styles.householdName}>{household?.name ?? "—"}</Text>
          <Text style={styles.memberCountText}>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </Text>
        </View>

        {/* Locations sub-section */}
        <View style={styles.locationsSection}>
          <Text style={styles.locationsLabel}>Locations</Text>
          {locations.map((loc) => (
            <View key={loc.id} style={styles.locationRow}>
              <Text style={styles.locationText}>
                {loc.icon} {loc.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Edit action rows */}
        <TouchableOpacity
          style={[styles.actionRow, styles.rowTopBorder]}
          onPress={() =>
            router.push(
              "/household/edit-name" as Parameters<typeof router.push>[0],
            )
          }>
          <Text style={styles.actionLabel}>Edit household name</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            router.push(
              "/household/edit-locations" as Parameters<typeof router.push>[0],
            )
          }>
          <Text style={styles.actionLabel}>Edit locations</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Insights */}
      <Text style={styles.sectionLabel}>Insights</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            router.push("/analytics" as Parameters<typeof router.push>[0])
          }>
          <View style={styles.actionLabelGroup}>
            <Text style={styles.actionLabel}>Waste analytics</Text>
            <Text style={styles.actionSubtitle}>
              Track your food waste over time
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App */}
      <Text style={styles.sectionLabel}>App</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.actionRow, styles.rowBottomBorder]}
          onPress={comingSoon}>
          <Text style={styles.actionLabel}>Notification settings</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={comingSoon}>
          <Text style={styles.actionLabel}>Rate TupperAware</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Danger zone */}
      <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger zone</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
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
  householdHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  householdName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  memberCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  locationsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingBottom: 4,
  },
  locationsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  locationRow: {
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rowTopBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabelGroup: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  signOutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.red,
    textAlign: "center",
  },
});
