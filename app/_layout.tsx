import React, { createContext, useState } from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Creamos el contexto para el Tema
export const ThemeContext = createContext({
  themePreference: "system",
  setThemePreference: (theme: string) => {},
  isDark: false,
});

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState("system"); // 'light', 'dark', 'system'

  // Determinamos si se debe usar el modo oscuro
  const isDark =
    themePreference === "system"
      ? systemColorScheme === "dark"
      : themePreference === "dark";

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, isDark }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? "#0F172A" : "#0EA5E9" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          tabBarStyle: {
            backgroundColor: isDark ? "#1E293B" : "#ffffff",
            borderTopColor: isDark ? "#334155" : "#E2E8F0",
          },
          tabBarActiveTintColor: isDark ? "#38BDF8" : "#0EA5E9",
          tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Calculadora",
            tabBarIcon: ({ color }) => <Ionicons name="calculator" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="quotes"
          options={{
            title: "Cotizar (PRO)",
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ThemeContext.Provider>
  );
}