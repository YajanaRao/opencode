import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"

export default function TabLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors["primary"],
        tabBarInactiveTintColor: colors["text-base"],
        tabBarStyle: {
          backgroundColor: colors["surface-base"],
          borderTopColor: colors["surface"],
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: "Connections",
          tabBarIcon: ({ color, size }) => <Ionicons name="server-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
