import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "SolarCalcPro - Calculadora Básica",
          headerStyle: { backgroundColor: "#0EA5E9" }, // Un azul limpio y tecnológico
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" }
        }} 
      />
    </Stack>
  );
}