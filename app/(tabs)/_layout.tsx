import {Tabs} from "expo-router";
import {Colors} from "../../constants/colors";
import {Text} from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {borderTopColor: Colors.border},
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: () => <Text style={{fontSize: 20}}>🍳</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: () => <Text style={{fontSize: 20}}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => <Text style={{fontSize: 20}}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
