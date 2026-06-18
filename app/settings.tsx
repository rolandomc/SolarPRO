import React, { useContext, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import { ThemeContext } from "./_layout";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

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
    router.push({ pathname: "/quotes", params: { editId: id } });
  };

  // HERRAMIENTA OCR REAL - Vuelca todo el JSON de la API en la consola
  const ejecutarLectorPruebaPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        Alert.alert("Escaneando", "Enviando archivo a la API (puede tardar unos segundos)...");
        
        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].name;
        const mimeType = result.assets[0].mimeType || "application/pdf";

        const formData = new FormData();
        formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
        formData.append("language", "spa");
        formData.append("apikey", "helloworld");
        formData.append("isOverlayRequired", "false");

        const response = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        const data = await response.json();
        const textoExtraido = data.ParsedResults?.[0]?.ParsedText || "No se detectó texto en el documento.";

        console.log("\n==================================================");
        console.log("--- TEXTO BRUTO DEL PDF (HERRAMIENTA DE DESARROLLADOR) ---");
        console.log(textoExtraido);
        console.log("==================================================\n");

        Alert.alert("OCR Finalizado", "Revisa la terminal de tu computadora para analizar la estructura del texto extraído.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar con el motor OCR.");
    }
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
          <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
            <h2>Propuesta de Sistema Solar (Copia)</h2>
            <h3>Cliente: ${cotizacion.cliente}</h3>
            <p>Fecha Original: ${cotizacion.fecha}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: #f8fafc; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Cant.</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Descripción</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Precio Unit.</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
              ${filasHTML}
            </table>
            <h2 style="text-align: right; margin-top: 30px;">Total: $${cotizacion.total.toFixed(2)}</h2>
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

        <Text style={[styles.title, dynamicStyles.text]}>Herramientas de Desarrollador</Text>
        <TouchableOpacity style={[styles.option, dynamicStyles.card, {borderColor: '#8B5CF6'}]} onPress={ejecutarLectorPruebaPDF}>
          <Ionicons name="terminal-outline" size={24} color="#8B5CF6" />
          <Text style={[styles.optionText, dynamicStyles.text, {fontWeight: '600'}]}>Lector PDF (Volcar Texto en Terminal)</Text>
        </TouchableOpacity>

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
  divider: { height: 1, backgroundColor: "#CBD5E1", marginVertical: 20 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  historyClient: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  historyTotal: { fontSize: 16, fontWeight: "bold", color: "#10B981", marginTop: 4 },
  actionButtons: { flexDirection: "row" },
  iconBtn: { padding: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8 },
  lockContainerMin: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  lockTitleMin: { fontSize: 18, fontWeight: "bold", marginTop: 10, marginBottom: 15 },
  buyButtonMin: { backgroundColor: "#0EA5E9", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  buyButtonTextMin: { color: "#FFF", fontSize: 14, fontWeight: "bold" }
});