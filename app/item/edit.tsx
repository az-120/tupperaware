import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useHousehold } from "../../hooks/useHousehold";
import { scheduleExpiryNotification } from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Item, ItemCategory } from "../../types";

const CATEGORIES: ItemCategory[] = ["Dairy", "Produce", "Meat", "Frozen", "Pantry", "Other"];

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { locations } = useHousehold();

  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<ItemCategory>("Other");
  const [locationId, setLocationId] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());

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

  useEffect(() => {
    if (!id) return;
    (async () => {
      const headers = await getHeaders();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?id=eq.${id}&limit=1`,
        { headers },
      );
      if (!res.ok) {
        setFetchError("Failed to load item.");
        setFetching(false);
        return;
      }
      const data = (await res.json()) as Item[];
      const item = data[0];
      if (!item) {
        setFetchError("Item not found.");
        setFetching(false);
        return;
      }
      setName(item.name);
      setQuantity(item.quantity ?? "");
      setCategory(item.category);
      setLocationId(item.location_id);
      setExpiryDate(new Date(item.expiry_date));
      setFetching(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }
    if (!locationId) {
      setError("Please select a location.");
      return;
    }

    setSaving(true);
    setError(null);

    const headers = await getHeaders();
    const expiryStr = expiryDate.toISOString().split("T")[0];

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantity.trim(),
          category,
          location_id: locationId,
          expiry_date: expiryStr,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    setSaving(false);

    if (!res.ok) {
      const body = await res.text();
      setError(`Failed to save: ${body}`);
      return;
    }

    const updated = (await res.json()) as Item[];
    if (updated[0]) {
      const loc = locations.find((l) => l.id === locationId);
      await scheduleExpiryNotification(updated[0], loc?.name);
    }

    router.back();
  };

  if (fetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.fetchErrorText}>{fetchError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Edit item</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Item name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Whole Milk"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1 gal, 12 ct"
          placeholderTextColor={Colors.textSecondary}
          value={quantity}
          onChangeText={setQuantity}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.pillRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <View style={styles.pillRow}>
          {locations.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={[styles.pill, locationId === loc.id && styles.pillActive]}
              onPress={() => setLocationId(loc.id)}
            >
              <Text style={[styles.pillText, locationId === loc.id && styles.pillTextActive]}>
                {loc.icon} {loc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Expiration date</Text>
        <View style={styles.datePicker}>
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_event: DateTimePickerEvent, date?: Date) => {
              if (date) setExpiryDate(date);
            }}
            style={styles.datePickerWidget}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  fetchErrorText: {
    color: Colors.textSecondary,
    fontSize: 15,
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
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
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
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: "#fff",
  },
  datePicker: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  datePickerWidget: {
    height: 120,
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
