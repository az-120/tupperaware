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
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { BarcodeScanner } from "../../components/BarcodeScanner";
import { lookupBarcode } from "../../lib/openFoodFacts";
import { supabase } from "../../lib/supabase";
import { scheduleExpiryNotification } from "../../lib/notifications";
import { validateItemName, validateExpiryDate } from "../../lib/validation";
import { getSuggestedExpiryDate, normalizeDate } from "../../lib/expiryDefaults";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Item, ItemCategory } from "../../types";

type Mode = "scan" | "manual";

const CATEGORIES: ItemCategory[] = ["Dairy", "Produce", "Meat", "Frozen", "Pantry", "Other"];

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Dairy: "🥛",
  Produce: "🥦",
  Meat: "🥩",
  Frozen: "❄️",
  Pantry: "🥫",
  Other: "📦",
};

const PRESET_EMOJIS = ["🥛", "🥚", "🧀", "🥩", "🥦", "🍎", "🍞", "🥫", "❄️", "📦"];

export default function AddItemScreen() {
  const { location_id } = useLocalSearchParams<{ location_id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { locations } = useHousehold();

  const [mode, setMode] = useState<Mode>(location_id ? "manual" : "scan");
  const [looking, setLooking] = useState(false);
  const [productNotFound, setProductNotFound] = useState(false);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<ItemCategory>("Other");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(location_id ?? "");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());

  const [emoji, setEmoji] = useState<string>(CATEGORY_EMOJI["Other"]);
  const [emojiInput, setEmojiInput] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDateSuggested, setIsDateSuggested] = useState(false);
  const dateManuallyEditedRef = useRef(false);

  // Debounce name → auto-suggest date
  useEffect(() => {
    if (dateManuallyEditedRef.current || !name.trim()) return;
    const timer = setTimeout(() => {
      if (!dateManuallyEditedRef.current) {
        setExpiryDate(getSuggestedExpiryDate(name, category));
        setIsDateSuggested(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (cat: ItemCategory) => {
    setCategory(cat);
    if (!emojiInput) {
      setEmoji(CATEGORY_EMOJI[cat]);
    }
    if (!dateManuallyEditedRef.current) {
      setExpiryDate(getSuggestedExpiryDate(name, cat));
      setIsDateSuggested(true);
    }
  };

  const handleScanned = async (barcode: string) => {
    setLooking(true);
    const result = await lookupBarcode(barcode);
    setLooking(false);
    if (result) {
      setName(result.name);
      setCategory(result.category);
      setExpiryDate(getSuggestedExpiryDate(result.name, result.category));
      setIsDateSuggested(true);
      dateManuallyEditedRef.current = false;
      setProductNotFound(false);
    } else {
      setName("");
      setProductNotFound(true);
    }
    setMode("manual");
  };

  const handleSubmit = async () => {
    const nameResult = validateItemName(name);
    const expiryResult = validateExpiryDate(expiryDate);
    setNameError(nameResult.error);
    if (!nameResult.valid) { setError(null); return; }
    if (!expiryResult.valid) { setError(expiryResult.error); return; }
    if (!selectedLocationId) {
      setError("Please select a location.");
      return;
    }
    if (!user) {
      setError("Not authenticated.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    const expiryStr = normalizeDate(expiryDate).toISOString().split("T")[0];

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items`,
      {
        method: "POST",
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          location_id: selectedLocationId,
          name: name.trim(),
          category,
          quantity: quantity.trim(),
          expiry_date: expiryStr,
          emoji: emoji || CATEGORY_EMOJI[category],
          status: "active",
          added_by: user.id,
        }),
      },
    );

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.text();
      setError(`Failed to add item: ${body}`);
      return;
    }

    const inserted = (await res.json()) as Item[];
    if (inserted[0]) {
      const selectedLocation = locations.find((l) => l.id === selectedLocationId);
      await scheduleExpiryNotification(inserted[0], selectedLocation?.name);
    }

    router.back();
  };

  return (
    <View style={styles.screen}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add Item</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Mode toggle */}
      <View style={styles.segmentRow}>
        {(["scan", "manual"] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.segment, mode === m && styles.segmentActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
              {m === "scan" ? "Scan" : "Manual"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "scan" ? (
        <View style={styles.scanContainer}>
          {looking ? (
            <View style={styles.lookingUp}>
              <ActivityIndicator color={Colors.blue} />
              <Text style={styles.lookingText}>Looking up product…</Text>
            </View>
          ) : (
            <BarcodeScanner onScanned={handleScanned} />
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {productNotFound && (
            <View style={styles.notFoundBanner}>
              <Text style={styles.notFoundText}>Product not found — enter manually</Text>
            </View>
          )}

          <Text style={styles.label}>Item name *</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="e.g. Whole Milk"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={(t) => { setName(t); setNameError(null); }}
            onBlur={() => setNameError(validateItemName(name).error)}
          />
          {nameError && <Text style={styles.fieldError}>{nameError}</Text>}

          <Text style={styles.label}>Icon</Text>
          <View style={styles.emojiPickerRow}>
            <View style={styles.emojiPreview}>
              <Text style={styles.emojiPreviewChar}>{emoji}</Text>
            </View>
            <View style={styles.emojiOptions}>
              {PRESET_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOption, emoji === e && !emojiInput && styles.emojiOptionActive]}
                  onPress={() => { setEmoji(e); setEmojiInput(""); }}
                >
                  <Text style={styles.emojiOptionChar}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            style={styles.emojiCustomInput}
            placeholder="or type one"
            placeholderTextColor={Colors.textSecondary}
            value={emojiInput}
            onChangeText={(t) => {
              setEmojiInput(t);
              if (t.trim()) setEmoji(t.trim());
            }}
            maxLength={4}
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
                onPress={() => handleCategoryChange(cat)}
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
                style={[styles.pill, selectedLocationId === loc.id && styles.pillActive]}
                onPress={() => setSelectedLocationId(loc.id)}
              >
                <Text style={[styles.pillText, selectedLocationId === loc.id && styles.pillTextActive]}>
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
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={new Date()}
              onChange={(_event: DateTimePickerEvent, date?: Date) => {
                if (date) {
                  setExpiryDate(date);
                  dateManuallyEditedRef.current = true;
                  setIsDateSuggested(false);
                }
              }}
            />
          </View>
          {isDateSuggested && (
            <Text style={styles.dateHint}>
              Suggested based on item type — tap to adjust
            </Text>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? "Adding…" : "Add item"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    minWidth: 64,
  },
  backText: {
    fontSize: 17,
    fontFamily: Typography.regular,
    color: Colors.blue,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  segmentRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.white,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontFamily: Typography.semibold,
  },
  scanContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  lookingUp: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#000",
    borderRadius: 12,
  },
  lookingText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontFamily: Typography.regular,
  },
  scroll: {
    flex: 1,
  },
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  notFoundBanner: {
    backgroundColor: Colors.amberBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.amber,
  },
  notFoundText: {
    color: Colors.amber,
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  inputError: {
    borderColor: Colors.red,
  },
  fieldError: {
    color: Colors.red,
    fontSize: 12,
    fontFamily: Typography.regular,
    marginTop: 4,
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
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  pillActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textInverse,
  },
  datePicker: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  emojiPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  emojiPreview: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.blueBg,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiPreviewChar: {
    fontSize: 24,
  },
  emojiOptions: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  emojiOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiOptionActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueBg,
  },
  emojiOptionChar: {
    fontSize: 18,
  },
  emojiCustomInput: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    marginBottom: 4,
  },
  dateHint: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: "italic",
  },
  error: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Typography.regular,
    marginTop: 16,
  },
  submitBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontFamily: Typography.semibold,
  },
});
