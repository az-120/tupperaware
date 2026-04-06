import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useHousehold } from "../../hooks/useHousehold";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";

type LocalLocation = {
  id: string;
  icon: string;
  name: string;
  originalName: string;
  originalIcon: string;
};

type NewLocation = {
  icon: string;
  name: string;
};

export default function EditLocationsScreen() {
  const router = useRouter();
  const { household, locations: contextLocations, refresh } = useHousehold();

  const [localLocations, setLocalLocations] = useState<LocalLocation[]>(
    contextLocations.map((l) => ({
      id: l.id,
      icon: l.icon,
      name: l.name,
      originalName: l.name,
      originalIcon: l.icon,
    })),
  );
  const [newLocations, setNewLocations] = useState<NewLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    return {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete location",
      `Delete "${name}"? Items in this location will be discarded.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const headers = await getHeaders();
            const res = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/locations?id=eq.${id}`,
              { method: "DELETE", headers },
            );
            if (res.ok) {
              setLocalLocations((prev) => prev.filter((l) => l.id !== id));
            } else {
              const body = await res.text();
              setError(`Failed to delete: ${body}`);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    const hasEmptyName = [
      ...localLocations.map((l) => l.name.trim()),
      ...newLocations.map((l) => l.name.trim()),
    ].some((n) => !n);

    if (hasEmptyName) {
      setError("Location names cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    const headers = await getHeaders();

    // PATCH modified existing locations
    for (const loc of localLocations) {
      if (loc.name.trim() === loc.originalName && loc.icon === loc.originalIcon) continue;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/locations?id=eq.${loc.id}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ name: loc.name.trim(), icon: loc.icon }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        setError(`Failed to update "${loc.name}": ${body}`);
        setSaving(false);
        return;
      }
    }

    // POST new locations
    const toPost = newLocations.filter((l) => l.name.trim());
    if (toPost.length > 0) {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/locations`,
        {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify(
            toPost.map((l) => ({
              household_id: household!.id,
              name: l.name.trim(),
              icon: l.icon,
            })),
          ),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        setError(`Failed to add locations: ${body}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    await refresh();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile" as Parameters<typeof router.replace>[0]);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile" as Parameters<typeof router.replace>[0]);
            }
          }}
          style={styles.navBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Edit locations</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {localLocations.map((loc) => (
          <View key={loc.id} style={styles.locationRow}>
            <TextInput
              style={styles.iconInput}
              value={loc.icon}
              onChangeText={(t) =>
                setLocalLocations((prev) =>
                  prev.map((l) => (l.id === loc.id ? { ...l, icon: t } : l)),
                )
              }
              maxLength={4}
              textAlign="center"
            />
            <TextInput
              style={styles.nameInput}
              value={loc.name}
              onChangeText={(t) =>
                setLocalLocations((prev) =>
                  prev.map((l) => (l.id === loc.id ? { ...l, name: t } : l)),
                )
              }
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(loc.id, loc.name)}
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}

        {newLocations.map((loc, index) => (
          <View key={`new-${index}`} style={styles.locationRow}>
            <TextInput
              style={styles.iconInput}
              value={loc.icon}
              onChangeText={(t) =>
                setNewLocations((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, icon: t } : l)),
                )
              }
              maxLength={4}
              textAlign="center"
            />
            <TextInput
              style={styles.nameInput}
              value={loc.name}
              placeholder="Location name"
              onChangeText={(t) =>
                setNewLocations((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, name: t } : l)),
                )
              }
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() =>
                setNewLocations((prev) => prev.filter((_, i) => i !== index))
              }
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            setNewLocations((prev) => [...prev, { icon: "📦", name: "" }])
          }
        >
          <Text style={styles.addBtnText}>+ Add location</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : "Save changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconInput: {
    fontSize: 20,
    width: 36,
    textAlign: "center",
    paddingVertical: 13,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 13,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  addBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: {
    fontSize: 15,
    color: Colors.blue,
    fontWeight: "500",
  },
  error: {
    color: Colors.red,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
