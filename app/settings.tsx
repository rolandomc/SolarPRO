import React, { useContext, useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, TextInput, Image, ScrollView } from "react-native";
import { ThemeContext } from "./_layout";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { procesarDocumentoOCR } from "../utils/ocrService";
import { generarCotizacionProfesional } from "../utils/pdfGenerator";

export default function Settings() {
  const { themePreference, setThemePreference, isDark } = useContext(ThemeContext);
  const router = useRouter();
  const [historial, setHistorial] = useState<any[]>([]);
  const [isPro, setIsPro] = useState(false); 

  // Estados del Perfil de Empresa
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [telefonoEmpresa, setTelefonoEmpresa] = useState("");
  const [emailEmpresa, setEmailEmpresa] = useState("");
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // Importante para inyectarlo en el PDF
    });

    if (!result.canceled && result.assets[0].base64) {
      setLogoEmpresa(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const guardarPerfil = async () => {
    const perfil = { nombre: nombreEmpresa, telefono: telefonoEmpresa, email: emailEmpresa, logoBase64: logoEmpresa };
    await AsyncStorage.setItem("perfilEmpresa", JSON.stringify(perfil));
    Alert.alert("Guardado", "Los datos de tu empresa aparecerán en tus PDFs.");
  };

  const limpiarHistorial = async () => {
    Alert.alert("Confirmación", "¿Borrar todo el historial?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: async () => { await AsyncStorage.removeItem("historialCotizaciones"); setHistorial([]); } }
    ]);
  };

  const ejecutarLectorPruebaPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (!result.canceled) {
        Alert.alert("Analizando", "Verificando consola...");
        const file = result.assets[0];
        const res = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");
        console.log("\n--- TEXTO BRUTO (DEBUG) ---\n", res.textoBruto, "\n---------------------------");
        Alert.alert("Finalizado", "Texto impreso en la terminal.");
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

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }, text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    subText: { color: isDark ? "#94A3B8" : "#64748B" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  const ThemeOption = ({ title, value, icon }: { title: string, value: string, icon: any }) => (
    <TouchableOpacity style={[styles.option, dynamicStyles.card, themePreference === value && styles.optionSelected]} onPress={() => setThemePreference(value)}>
      <Ionicons name={icon} size={24} color={themePreference === value ? "#0EA5E9" : (isDark ? "#94A3B8" : "#64748B")} />
      <Text style={[styles.optionText, dynamicStyles.text, themePreference === value && {color: "#0EA5E9", fontWeight: 'bold'}]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={dynamicStyles.container}>
      <View style={styles.container}>
        
        {/* PERFIL EMPRESA */}
        <Text style={[styles.title, dynamicStyles.text]}>Perfil de tu Empresa (PDF)</Text>
        <View style={[styles.card, dynamicStyles.card, {padding: 16, marginBottom: 20}]}>
          
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <TouchableOpacity onPress={seleccionarLogo} style={{width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 16}}>
              {logoEmpresa ? <Image source={{ uri: logoEmpresa }} style={{width: 80, height: 80}} /> : <Ionicons name="camera" size={30} color="#94A3B8" />}
            </TouchableOpacity>
            <View style={{flex: 1}}>
              <Text style={[dynamicStyles.text, {fontWeight: 'bold', marginBottom: 4}]}>Logo Institucional</Text>
              <Text style={dynamicStyles.subText}>Aparecerá en el encabezado de tus cotizaciones.</Text>
            </View>
          </View>

          <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 10}]} placeholder="Nombre de la Empresa" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={nombreEmpresa} onChangeText={setNombreEmpresa} />
          <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 10}]} placeholder="Teléfono" keyboardType="phone-pad" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={telefonoEmpresa} onChangeText={setTelefonoEmpresa} />
          <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 10}]} placeholder="Correo Electrónico" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={emailEmpresa} onChangeText={setEmailEmpresa} />
          
          <TouchableOpacity style={{backgroundColor: "#10B981", padding: 12, borderRadius: 8, alignItems: "center"}} onPress={guardarPerfil}>
            <Text style={{color: "#FFF", fontWeight: "bold"}}>Guardar Perfil</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, dynamicStyles.text]}>Apariencia</Text>
        <ThemeOption title="Automático" value="system" icon="phone-portrait-outline" />
        <ThemeOption title="Modo Claro" value="light" icon="sunny-outline" />
        <ThemeOption title="Modo Oscuro" value="dark" icon="moon-outline" />

        <View style={styles.divider} />
        <Text style={[styles.title, dynamicStyles.text]}>Herramientas Dev</Text>
        <TouchableOpacity style={[styles.option, dynamicStyles.card, {borderColor: '#8B5CF6'}]} onPress={ejecutarLectorPruebaPDF}>
          <Ionicons name="terminal-outline" size={24} color="#8B5CF6" />
          <Text style={[styles.optionText, dynamicStyles.text]}>Test Lector PDF</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <View style={styles.historyHeader}>
          <Text style={[styles.title, dynamicStyles.text, {marginBottom: 0}]}>Historial (PRO)</Text>
          {historial.length > 0 && <TouchableOpacity onPress={limpiarHistorial}><Ionicons name="trash-outline" size={24} color="#EF4444" /></TouchableOpacity>}
        </View>

        <View style={{ marginTop: 16 }}>
          {historial.map((item) => (
            <View key={item.id} style={[styles.historyCard, dynamicStyles.card]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyClient, dynamicStyles.text]}>{item.cliente}</Text>
                <Text style={dynamicStyles.subText}>{item.fecha}</Text>
                <Text style={{fontSize: 16, fontWeight: "bold", color: "#10B981"}}>${item.total.toFixed(2)}</Text>
              </View>
              <View style={{flexDirection: "row"}}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: "/quotes", params: { editId: item.id } })}><Ionicons name="pencil" size={22} color="#0EA5E9" /></TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, {marginLeft: 10}]} onPress={() => compartirCotizacionPDF(item)}><Ionicons name="share-social" size={22} color="#10B981" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  card: { borderRadius: 12, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  option: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  optionSelected: { borderColor: "#0EA5E9", backgroundColor: "rgba(14, 165, 233, 0.1)" },
  optionText: { fontSize: 16, marginLeft: 12 },
  divider: { height: 1, backgroundColor: "#CBD5E1", marginVertical: 20 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  historyClient: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  iconBtn: { padding: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8 }
});