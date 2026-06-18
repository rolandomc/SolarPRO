import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeContext } from "./_layout";
import { Ionicons } from "@expo/vector-icons";

export default function Settings() {
  const { themePreference, setThemePreference, isDark } = useContext(ThemeContext);

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  const ThemeOption = ({ title, value, icon }: { title: string, value: string, icon: any }) => (
    <TouchableOpacity 
      style={[styles.option, dynamicStyles.card, themePreference === value && styles.optionSelected]} 
      onPress={() => setThemePreference(value)}
    >
      <Ionicons name={icon} size={24} color={themePreference === value ? "#0EA5E9" : (isDark ? "#94A3B8" : "#64748B")} />
      <Text style={[styles.optionText, dynamicStyles.text, themePreference === value && {color: "#0EA5E9", fontWeight: 'bold'}]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.text]}>Apariencia</Text>
      <ThemeOption title="Automático (Sistema)" value="system" icon="phone-portrait-outline" />
      <ThemeOption title="Modo Claro" value="light" icon="sunny-outline" />
      <ThemeOption title="Modo Oscuro" value="dark" icon="moon-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  optionSelected: { borderColor: "#0EA5E9", backgroundColor: "rgba(14, 165, 233, 0.1)" },
  optionText: { fontSize: 16, marginLeft: 12 }
});