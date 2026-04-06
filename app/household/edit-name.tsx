import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useHousehold } from "../../hooks/useHousehold";
import { supabase } from "../../lib/supabase";
import { validateHouseholdName } from "../../lib/validation";
import { Colors } from "../../constants/colors";

export default function EditHouseholdNameScreen() {
  const router = useRouter();
  const { household, refresh } = useHousehold();

  const [name, setName] = useState(household?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const result = validateHouseholdName(name);
    setNameError(result.error);
    if (!result.valid) return;

    setSaving(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/households?id=eq.${household!.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ name: name.trim() }),
      },
    );

    setSaving(false);

    if (!res.ok) {
      const body = await res.text();
      setError(`Failed to save: ${body}`);
      return;
    }

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
        <Text style={styles.navTitle}>Edit household name</Text>
        <View style={styles.navBtn} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Household name *</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setNameError(null);
          }}
          onBlur={() => setNameError(validateHouseholdName(name).error)}
          placeholder="e.g. The Smiths"
          placeholderTextColor={Colors.textSecondary}
        />
        {nameError && <Text style={styles.fieldError}>{nameError}</Text>}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
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
  form: {
    padding: 16,
    paddingTop: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: Colors.red,
  },
  fieldError: {
    color: Colors.red,
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: Colors.red,
    fontSize: 14,
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
