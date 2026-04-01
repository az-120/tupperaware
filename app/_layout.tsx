import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthContext, useAuth, useAuthProvider } from "../hooks/useAuth";
import { Colors } from "../constants/colors";

function AuthGate() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/");
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const authValue = useAuthProvider();

  return (
    <AuthContext.Provider value={authValue}>
      <AuthGate />
    </AuthContext.Provider>
  );
}
