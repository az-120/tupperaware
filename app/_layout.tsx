import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { AuthContext, useAuth, useAuthProvider } from "../hooks/useAuth";
import { HouseholdContext, useHousehold, useHouseholdProvider } from "../hooks/useHousehold";
import {
  requestPermissions,
  scheduleAllExpiryNotifications,
} from "../lib/notifications";
import { supabase } from "../lib/supabase";
import { Colors } from "../constants/colors";
import { Item } from "../types";

function NotificationSetup() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const router = useRouter();
  const scheduledRef = useRef(false);

  // Schedule notifications once session + household are confirmed
  useEffect(() => {
    if (authLoading || householdLoading || !session || !household) return;
    if (scheduledRef.current) return;
    scheduledRef.current = true;

    (async () => {
      const granted = await requestPermissions();
      if (!granted) return;

      const fetchedSession = (await supabase.auth.getSession()).data.session;
      const params = new URLSearchParams({
        select: "*,locations(household_id)",
        status: "eq.active",
        "locations.household_id": `eq.${household.id}`,
      });

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/items?${params.toString()}`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${fetchedSession?.access_token ?? ""}`,
          },
        },
      );

      if (res.ok) {
        const items = (await res.json()) as Item[];
        await scheduleAllExpiryNotifications(items);
      }
    })();
  }, [authLoading, householdLoading, session, household]);

  // Notification listeners
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("Notification received:", notification.request.content);
        }
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      () => {
        router.push("/(tabs)/expiring" as Parameters<typeof router.push>[0]);
      },
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return null;
}

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
        <NotificationSetup />
        <AuthGate />
      </HouseholdGate>
    </AuthContext.Provider>
  );
}
