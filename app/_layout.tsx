// app/_layout.tsx (fragmento)
// ... importaciones anteriores
export default function RootLayout() {
  // ... lógica de tema
  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, isDark }}>
      <Tabs /* ...opciones... */>
        <Tabs.Screen name="index" options={{ title: "Básica", tabBarIcon: ({ color }) => <Ionicons name="calculator" size={24} color={color} /> }} />
        
        {/* NUEVA PESTAÑA PRO */}
        <Tabs.Screen name="pro-calculator" options={{ title: "Ingeniería PRO", tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} /> }} />
        
        <Tabs.Screen name="quotes" options={{ title: "Cotizar", tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> }} />
      </Tabs>
    </ThemeContext.Provider>
  );
}