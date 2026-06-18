import React, { useContext, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import { ThemeContext } from "./_layout";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export default function Settings() {
  const { themePreference, setThemePreference, isDark } = useContext(ThemeContext);
  const router = useRouter();
  const [historial, setHistorial] = useState<any[]>([]);
  const [isPro, setIsPro] = useState(false); 

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [])
  );

  const cargarHistorial = async () => {
    try {
      const data = await AsyncStorage.getItem("historialCotizaciones");
      if (data) setHistorial(JSON.parse(data).reverse());
    } catch (error) {
      console.log("Error al cargar el historial");
    }
  };

  const limpiarHistorial = async () => {
    Alert.alert("Confirmación", "¿Borrar todo el historial?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem("historialCotizaciones");
          setHistorial([]);
        }
      }
    ]);
  };

  const editarCotizacion = (id: string) => {
    // Navegar a quotes.tsx pasando el ID
    router.push({ pathname: "/quotes", params: { editId: id } });
  };

  const compartirCotizacionPDF = async (cotizacion: any) => {
    try {
      const filasHTML = (cotizacion.items || []).map((item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.cantidad}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.descripcion}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.precio}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333;">
            <div style="text-align: center; border-bottom: 2px solid #0EA5E9; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="color: #0EA5E9; margin: 0;">Propuesta de Sistema Solar (Copia)</h1>
            </div>
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0;">Preparado para: <span style="color: #555;">${cotizacion.cliente}</span></h3>
              <p style="margin: 5px 0 0 0; color: #777;">Fecha original: ${cotizacion.fecha}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f8fafc; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Cant.</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Descripción</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Precio Unit.</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
              ${filasHTML}
            </table>
            <div style="text-align: right; margin-top: 30px; padding-top: 20px; border-top: 2px solid #0EA5E9;">
              <h2>Inversión Total Estimada: <span style="color: #10B981;">$${cotizacion.total.toFixed(2)}</span></h2>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Error", "No se pudo regenerar el documento.");
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    subText: { color: isDark ? "#94A3B8" : "#64748B" },
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
    <View style={{ flex: 1 }}>
      <View style={[styles.container, dynamicStyles.container]}>
        
        <Text style={[styles.title, dynamicStyles.text]}>Apariencia</Text>
        <ThemeOption title="Automático (Sistema)" value="system" icon="phone-portrait-outline" />
        <ThemeOption title="Modo Claro" value="light" icon="sunny-outline" />
        <ThemeOption title="Modo Oscuro" value="dark" icon="moon-outline" />

        <View style={styles.divider} />

        <View style={styles.historyHeader}>
          <Text style={[styles.title, dynamicStyles.text, {marginBottom: 0}]}>Historial de Proyectos</Text>
          {historial.length > 0 && (
            <TouchableOpacity onPress={limpiarHistorial}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flex: 1, marginTop: 16 }}>
          <FlatList
            data={historial}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={[dynamicStyles.subText, {textAlign: 'center', marginTop: 20}]}>No hay cotizaciones guardadas aún.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.historyCard, dynamicStyles.card]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyClient, dynamicStyles.text]}>{item.cliente}</Text>
                  <Text style={dynamicStyles.subText}>{item.fecha}</Text>
                  <Text style={[styles.historyTotal, dynamicStyles.text]}>${item.total.toFixed(2)}</Text>
                </View>
                
                {/* Botones de acción del historial */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => editarCotizacion(item.id)}>
                    <Ionicons name="pencil" size={22} color="#0EA5E9" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, {marginLeft: 10}]} onPress={() => compartirCotizacionPDF(item)}>
                    <Ionicons name="share-social" size={22} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          {!isPro && (
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
              <View style={styles.lockContainerMin}>
                <Ionicons name="lock-closed" size={40} color="#0EA5E9" />
                <Text style={[styles.lockTitleMin, { color: isDark ? "#FFF" : "#0F172A" }]}>Historial PRO</Text>
                <TouchableOpacity style={styles.buyButtonMin} onPress={() => setIsPro(true)}>
                  <Text style={styles.buyButtonTextMin}>Desbloquear (Test)</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  optionSelected: { borderColor: "#0EA5E9", backgroundColor: "rgba(14, 165, 233, 0.1)" },
  optionText: { fontSize: 16, marginLeft: 12 },
  divider: { height: 1, backgroundColor: "#CBD5E1", marginVertical: 24 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, elevation: 2 },
  historyClient: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  historyTotal: { fontSize: 16, fontWeight: "bold", color: "#10B981", marginTop: 4 },
  actionButtons: { flexDirection: "row" },
  iconBtn: { padding: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8 },
  lockContainerMin: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  lockTitleMin: { fontSize: 18, fontWeight: "bold", marginTop: 10, marginBottom: 15 },
  buyButtonMin: { backgroundColor: "#0EA5E9", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  buyButtonTextMin: { color: "#FFF", fontSize: 14, fontWeight: "bold" }
});