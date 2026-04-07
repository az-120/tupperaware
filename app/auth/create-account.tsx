import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { validateEmail, validatePassword } from "../../lib/validation";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";

export default function CreateAccountScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    setEmailError(emailResult.error);
    setPasswordError(passwordResult.error);
    if (!emailResult.valid || !passwordResult.valid) return;

    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (authError) setError(authError.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>TupperAware</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <TextInput
        style={[styles.input, emailError ? styles.inputError : null]}
        placeholder="Email"
        placeholderTextColor={Colors.textSecondary}
        value={email}
        onChangeText={(t) => { setEmail(t); setEmailError(null); }}
        onBlur={() => setEmailError(validateEmail(email).error)}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {emailError && <Text style={styles.error}>{emailError}</Text>}
      <TextInput
        style={[styles.input, passwordError ? styles.inputError : null]}
        placeholder="Password"
        placeholderTextColor={Colors.textSecondary}
        value={password}
        onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
        onBlur={() => setPasswordError(validatePassword(password).error)}
        secureTextEntry
      />
      {passwordError && <Text style={styles.error}>{passwordError}</Text>}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleCreateAccount} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Creating account…" : "Create account"}</Text>
      </TouchableOpacity>

      <Link href="/auth/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.bold,
    color: Colors.blue,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 32,
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
  error: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Typography.regular,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontFamily: Typography.semibold,
  },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.blue,
    fontSize: 14,
    fontFamily: Typography.regular,
  },
});
