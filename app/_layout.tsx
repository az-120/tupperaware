import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthContext, useAuth, useAuthProvider } from "../hooks/useAuth";
import { HouseholdContext, useHousehold, useHouseholdProvider } from "../hooks/useHousehold";
import { Colors } from "../constants/colors";

function AuthGate() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const router = useRouter();
  const segments = useSegments();

  const loading = authLoading || householdLoading;

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";
    const onCreateHousehold = (segments as string[]).includes("create-household");

    if (!session && !inAuthGroup) {
      router.replace("/auth/sign-in");
    } else if (session && !household && !onCreateHousehold) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace("/auth/create-household" as any);
    } else if (session && household && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, household, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return <Slot />;
}

function HouseholdGate({ children }: { children: React.ReactNode }) {
  const householdValue = useHouseholdProvider();
  return (
    <HouseholdContext.Provider value={householdValue}>
      {children}
    </HouseholdContext.Provider>
  );
}

export default function RootLayout() {
  const authValue = useAuthProvider();

  return (
    <AuthContext.Provider value={authValue}>
      <HouseholdGate>
        <AuthGate />
      </HouseholdGate>
    </AuthContext.Provider>
  );
}
