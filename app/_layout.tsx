import React, { useState, useEffect, createContext } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  themePreference: "system",
  setThemePreference: () => {},
  isDark: false,
});

const THEME_KEY = "@solarpro_theme";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemePreferenceState(saved);
      }
    });
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    AsyncStorage.setItem(THEME_KEY, pref);
  };

  const isDark =
    themePreference === "dark" ||
    (themePreference === "system" && systemScheme === "dark");

  const activeTint   = isDark ? "#38BDF8" : "#0EA5E9";
  const inactiveTint = isDark ? "#475569" : "#94A3B8";
  const tabBarBg     = isDark ? "#0F172A" : "#FFFFFF";

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, isDark }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarStyle: { backgroundColor: tabBarBg, borderTopColor: isDark ? "#1E293B" : "#E2E8F0" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Básica",
            tabBarIcon: ({ color }) => <Ionicons name="calculator" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="pro-calculator"
          options={{
            title: "PRO",
            tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="quotes"
          options={{
            title: "Cotizar",
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Historial",
            tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
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
