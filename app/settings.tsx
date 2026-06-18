import React, { useContext, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "./_layout";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { procesarDocumentoOCR } from "../utils/ocrService";
import { generarCotizacionProfesional } from "../utils/pdfGenerator";

export default function Settings() {
  const { themePreference, setThemePreference, isDark } = useContext(ThemeContext);
  const router = useRouter();
  const [historial, setHistorial] = useState<any[]>([]);

  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [telefonoEmpresa, setTelefonoEmpresa] = useState("");
  const [emailEmpresa, setEmailEmpresa] = useState("");
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => { cargarDatos(); }, [])
  );

  const cargarDatos = async () => {
    try {
      const dataHistorial = await AsyncStorage.getItem("historialCotizaciones");
      if (dataHistorial) setHistorial(JSON.parse(dataHistorial).reverse());
      const dataPerfil = await AsyncStorage.getItem("perfilEmpresa");
      if (dataPerfil) {
        const perfil = JSON.parse(dataPerfil);
        setNombreEmpresa(perfil.nombre || "");
        setTelefonoEmpresa(perfil.telefono || "");
        setEmailEmpresa(perfil.email || "");
        setLogoEmpresa(perfil.logoBase64 || null);
      }
    } catch (error) {}
  };

  const seleccionarLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setLogoEmpresa(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const guardarPerfil = async () => {
    const perfil = { nombre: nombreEmpresa, telefono: telefonoEmpresa, email: emailEmpresa, logoBase64: logoEmpresa };
    await AsyncStorage.setItem("perfilEmpresa", JSON.stringify(perfil));
    Alert.alert("Guardado", "Los datos de tu empresa apareceran en tus PDFs.");
  };

  // Eliminar UN registro del historial
  const eliminarCotizacion = (id: string, nombreCliente: string) => {
    Alert.alert(
      "Eliminar cotizacion",
      `Eliminar la cotizacion de ${nombreCliente}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            try {
              const data = await AsyncStorage.getItem("historialCotizaciones");
              if (!data) return;
              const actual = JSON.parse(data);
              const nuevo = actual.filter((c: any) => c.id !== id);
              await AsyncStorage.setItem("historialCotizaciones", JSON.stringify(nuevo));
              setHistorial(prev => prev.filter(c => c.id !== id));
            } catch (error) {}
          },
        },
      ]
    );
  };

  // Borrar TODO el historial
  const limpiarHistorial = async () => {
    Alert.alert("Borrar todo el historial", "Esta accion no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar todo", style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("historialCotizaciones");
          setHistorial([]);
        },
      },
    ]);
  };

  const ejecutarLectorPruebaPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        const res = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");
        console.log("\n--- TEXTO BRUTO (DEBUG) ---\n", res.textoBruto, "\n---------------------------");
        Alert.alert("Finalizado", `Cliente: ${res.cliente}\nConsumo: ${res.consumo} kWh\n${res.mensaje}`);
      }
    } catch (error) { Alert.alert("Error", "Fallo al leer."); }
  };

  const compartirCotizacionPDF = async (cotizacion: any) => {
    try {
      const perfilGuardado = await AsyncStorage.getItem("perfilEmpresa");
      const perfil = perfilGuardado ? JSON.parse(perfilGuardado) : null;
      await generarCotizacionProfesional(cotizacion.cliente, cotizacion.items, cotizacion.total, perfil);
    } catch (error) { Alert.alert("Error", "No se pudo regenerar."); }
  };

  const ds = {
    bg:    { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text:  { color: isDark ? "#F1F5F9" : "#0F172A" },
    sub:   { color: isDark ? "#94A3B8" : "#64748B" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card:  { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
  };

  const ThemeOption = ({ title, value, icon }: { title: string; value: string; icon: any }) => (
    <TouchableOpacity style={[styles.option, ds.card, themePreference === value && styles.optionSelected]} onPress={() => setThemePreference(value as any)}>
      <Ionicons name={icon} size={24} color={themePreference === value ? "#0EA5E9" : (isDark ? "#94A3B8" : "#64748B")} />
      <Text style={[styles.optionText, ds.text, themePreference === value && { color: "#0EA5E9", fontWeight: "bold" }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[{ flex: 1 }, ds.bg]} edges={["top", "left", "right"]}>
      <ScrollView style={ds.bg}>
        <View style={styles.container}>

          {/* PERFIL EMPRESA */}
          <Text style={[styles.title, ds.text]}>Perfil de Empresa (PDF)</Text>
          <View style={[styles.card, ds.card, { padding: 16, marginBottom: 20 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity onPress={seleccionarLogo} style={styles.logoBtn}>
                {logoEmpresa
                  ? <Image source={{ uri: logoEmpresa }} style={{ width: 80, height: 80 }} />
                  : <Ionicons name="camera" size={30} color="#94A3B8" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[ds.text, { fontWeight: "bold", marginBottom: 4 }]}>Logo Institucional</Text>
                <Text style={ds.sub}>Aparecera en el encabezado de tus cotizaciones.</Text>
              </View>
            </View>
            <TextInput style={[styles.input, ds.input, { marginBottom: 10 }]} placeholder="Nombre de la Empresa" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={nombreEmpresa} onChangeText={setNombreEmpresa} />
            <TextInput style={[styles.input, ds.input, { marginBottom: 10 }]} placeholder="Telefono" keyboardType="phone-pad" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={telefonoEmpresa} onChangeText={setTelefonoEmpresa} />
            <TextInput style={[styles.input, ds.input, { marginBottom: 10 }]} placeholder="Correo Electronico" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={emailEmpresa} onChangeText={setEmailEmpresa} />
            <TouchableOpacity style={{ backgroundColor: "#10B981", padding: 12, borderRadius: 8, alignItems: "center" }} onPress={guardarPerfil}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Guardar Perfil</Text>
            </TouchableOpacity>
          </View>

          {/* APARIENCIA */}
          <Text style={[styles.title, ds.text]}>Apariencia</Text>
          <ThemeOption title="Automatico" value="system" icon="phone-portrait-outline" />
          <ThemeOption title="Modo Claro" value="light" icon="sunny-outline" />
          <ThemeOption title="Modo Oscuro" value="dark" icon="moon-outline" />

          <View style={styles.divider} />

          {/* DEV */}
          <Text style={[styles.title, ds.text]}>Herramientas Dev</Text>
          <TouchableOpacity style={[styles.option, ds.card, { borderColor: "#8B5CF6" }]} onPress={ejecutarLectorPruebaPDF}>
            <Ionicons name="terminal-outline" size={24} color="#8B5CF6" />
            <Text style={[styles.optionText, ds.text]}>Test Lector PDF</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* HISTORIAL */}
          <View style={styles.historyHeader}>
            <Text style={[styles.title, ds.text, { marginBottom: 0 }]}>Historial (PRO)</Text>
            {historial.length > 0 && (
              <TouchableOpacity onPress={limpiarHistorial} style={styles.borrarTodoBtn}>
                <Ionicons name="trash" size={16} color="#FFF" />
                <Text style={styles.borrarTodoText}>Borrar todo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            {historial.length === 0 && (
              <Text style={[ds.sub, { textAlign: "center", marginTop: 10 }]}>Sin cotizaciones guardadas</Text>
            )}
            {historial.map(item => (
              <View key={item.id} style={[styles.historyCard, ds.card]}>
                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyClient, ds.text]}>{item.cliente}</Text>
                  <Text style={ds.sub}>{item.fecha}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#10B981" }}>
                    ${item.total.toFixed(2)}
                  </Text>
                </View>
                {/* Acciones */}
                <View style={{ flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {/* Editar */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => router.push({ pathname: "/quotes", params: { editId: item.id } })}
                  >
                    <Ionicons name="pencil" size={20} color="#0EA5E9" />
                  </TouchableOpacity>
                  {/* Compartir PDF */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => compartirCotizacionPDF(item)}
                  >
                    <Ionicons name="share-social" size={20} color="#10B981" />
                  </TouchableOpacity>
                  {/* Eliminar uno */}
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: "rgba(239,68,68,0.1)" }]}
                    onPress={() => eliminarCotizacion(item.id, item.cliente)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: 20, paddingBottom: 50 },
  title:          { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  card:           { borderRadius: 12, borderWidth: 1 },
  input:          { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  option:         { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  optionSelected: { borderColor: "#0EA5E9", backgroundColor: "rgba(14,165,233,0.1)" },
  optionText:     { fontSize: 16, marginLeft: 12 },
  divider:        { height: 1, backgroundColor: "#CBD5E1", marginVertical: 20 },
  historyHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  borrarTodoBtn:  { flexDirection: "row", alignItems: "center", backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  borrarTodoText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  historyCard:    { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  historyClient:  { fontSize: 17, fontWeight: "bold", marginBottom: 2 },
  iconBtn:        { padding: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8 },
  logoBtn:        { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center", overflow: "hidden", marginRight: 16 },
});
