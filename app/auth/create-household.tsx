import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {useState} from "react";
import {useRouter} from "expo-router";
import {supabase} from "../../lib/supabase";
import {useAuth} from "../../hooks/useAuth";
import {useHousehold} from "../../hooks/useHousehold";
import {validateHouseholdName} from "../../lib/validation";
import {Colors} from "../../constants/colors";
import {Typography} from "../../constants/typography";

const DEFAULT_LOCATIONS: {name: string; icon: string}[] = [
  {name: "Fridge", icon: "🧊"},
  {name: "Pantry", icon: "🥫"},
  {name: "Freezer", icon: "❄️"},
];

export function CreateHouseholdScreen() {
  const router = useRouter();
  const {user} = useAuth();
  const {refresh} = useHousehold();

  const [householdName, setHouseholdName] = useState("");
  const [selectedDefaults, setSelectedDefaults] = useState<Set<string>>(
    new Set(DEFAULT_LOCATIONS.map((l) => l.name)),
  );
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDefault = (name: string) => {
    setSelectedDefaults((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateCustomLocation = (index: number, value: string) => {
    setCustomLocations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCreate = async () => {
    const nameResult = validateHouseholdName(householdName);
    setNameError(nameResult.error);
    if (!nameResult.valid) return;
    if (!user) {
      setError("Not authenticated.");
      return;
    }

    setLoading(true);
    setError(null);

    // debugging
    // const {
    //   data: {session},
    // } = await supabase.auth.getSession();
    // console.log(
    //   "Full session token:",
    //   session?.access_token ? "EXISTS" : "MISSING",
    // );
    // console.log("User ID:", session?.user?.id);
    // console.log("Role:", session?.user?.role);
    // console.log("Token preview:", session?.access_token?.slice(0, 20));

    // console.log("URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
    // console.log(
    //   "Key preview:",
    //   process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20),
    // );
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/households`,
      {
        method: "POST",
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({name: "Test"}),
      },
    );
    console.log("Raw response status:", response.status);
    const text = await response.text();
    console.log("Raw response body:", text);

    const {data: householdData, error: householdError} = await supabase
      .from("households")
      .insert({name: householdName.trim()})
      .select("id")
      .single();

    if (householdError || !householdData) {
      setError(householdError?.message ?? "Failed to create household.");
      setLoading(false);
      return;
    }

    const householdId = householdData.id as string;

    const {error: memberError} = await supabase
      .from("household_members")
      .insert({household_id: householdId, user_id: user.id, role: "owner"});

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    const locationRows = [
      ...DEFAULT_LOCATIONS.filter((l) => selectedDefaults.has(l.name)).map(
        (l) => ({
          household_id: householdId,
          name: l.name,
          icon: l.icon,
        }),
      ),
      ...customLocations
        .filter((name) => name.trim().length > 0)
        .map((name) => ({
          household_id: householdId,
          name: name.trim(),
          icon: "📦",
        })),
    ];

    if (locationRows.length > 0) {
      const {error: locationError} = await supabase
        .from("locations")
        .insert(locationRows);
      if (locationError) {
        setError(locationError.message);
        setLoading(false);
        return;
      }
    }

    await refresh();
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your household</Text>
        <Text style={styles.subtitle}>
          Name it and pick your storage locations.
        </Text>

        <Text style={styles.label}>Household name</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          placeholder="e.g. The Smiths"
          placeholderTextColor={Colors.textSecondary}
          value={householdName}
          onChangeText={(t) => { setHouseholdName(t); setNameError(null); }}
          onBlur={() => setNameError(validateHouseholdName(householdName).error)}
        />
        {nameError && <Text style={styles.error}>{nameError}</Text>}

        <Text style={styles.label}>Default locations</Text>
        <View style={styles.pillRow}>
          {DEFAULT_LOCATIONS.map((loc) => {
            const selected = selectedDefaults.has(loc.name);
            return (
              <TouchableOpacity
                key={loc.name}
                style={[
                  styles.pill,
                  selected ? styles.pillSelected : styles.pillUnselected,
                ]}
                onPress={() => toggleDefault(loc.name)}>
                <Text
                  style={[
                    styles.pillText,
                    selected
                      ? styles.pillTextSelected
                      : styles.pillTextUnselected,
                  ]}>
                  {loc.icon} {loc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {customLocations.map((val, index) => (
          <TextInput
            key={index}
            style={[styles.input, styles.customInput]}
            placeholder="Custom location name"
            placeholderTextColor={Colors.textSecondary}
            value={val}
            onChangeText={(text) => updateCustomLocation(index, text)}
          />
        ))}

        <TouchableOpacity
          style={styles.addCustom}
          onPress={() => setCustomLocations((prev) => [...prev, ""])}>
          <Text style={styles.addCustomText}>+ Add custom location</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleCreate}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Creating…" : "Create household"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default CreateHouseholdScreen;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.bold,
    color: Colors.blue,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    marginBottom: 4,
  },
  inputError: {
    borderColor: Colors.red,
  },
  customInput: {
    marginTop: 8,
    marginBottom: 0,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  pillSelected: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  pillUnselected: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 14,
    fontFamily: Typography.medium,
  },
  pillTextSelected: {
    color: Colors.textInverse,
  },
  pillTextUnselected: {
    color: Colors.textSecondary,
  },
  addCustom: {
    marginTop: 12,
    marginBottom: 8,
  },
  addCustomText: {
    color: Colors.blue,
    fontSize: 15,
    fontFamily: Typography.medium,
  },
  error: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Typography.regular,
    marginTop: 12,
    marginBottom: 4,
  },
  button: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontFamily: Typography.semibold,
  },
});
