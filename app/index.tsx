import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { ThemeContext } from "./_layout";
import { procesarDocumentoOCR } from "../utils/ocrService"; // <--- Importamos nuestro módulo

export default function Index() {
  const { isDark } = useContext(ThemeContext);

  const [consumoMensual, setConsumoMensual] = useState("");
  const [potenciaPanel, setPotenciaPanel] = useState("");
  const [porcentajeAhorro, setPorcentajeAhorro] = useState("100");
  
  const [tarifaLuz, setTarifaLuz] = useState(2.50); 
  const HSP_DEFAULT = 5.5; 
  const COSTO_INSTALACION_W = 20; 
  
  const [resultados, setResultados] = useState<any>(null);

  const escanearRecibo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        Alert.alert("Analizando", "Procesando documento con el motor central...");
        const file = result.assets[0];
        
        // Llamada limpia a nuestro archivo de utilidades
        const respuestaOCR = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");

        if (!respuestaOCR.exito) {
          Alert.alert("Error OCR", respuestaOCR.error);
          return;
        }

        if (respuestaOCR.consumo) {
          setConsumoMensual(respuestaOCR.consumo);
          Alert.alert("Extracción Exitosa", `Consumo detectado: ${respuestaOCR.consumo} kWh\n(Promedio diario: ${(parseFloat(respuestaOCR.consumo)/30).toFixed(2)} kWh)`);
        } else {
          Alert.alert("Revisión manual", "No se encontró el consumo en el formato esperado.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Fallo en la selección del archivo.");
    }
  };

  const calcularSistema = () => {
    const consumo = parseFloat(consumoMensual);
    const panelW = parseFloat(potenciaPanel);
    const ahorroEsperado = parseFloat(porcentajeAhorro) / 100;

    if (isNaN(consumo) || isNaN(panelW) || panelW <= 0) return Alert.alert("Error", "Datos incompletos.");

    const consumoDiario = consumo / 30;
    const energiaRequerida = (consumoDiario * 1.2) * ahorroEsperado; 
    const potenciaArregloKW = energiaRequerida / HSP_DEFAULT;
    const potenciaArregloW = potenciaArregloKW * 1000;
    const numeroPaneles = Math.ceil(potenciaArregloW / panelW);
    const potenciaTotalInstalada = (numeroPaneles * panelW) / 1000;
    const inversorRecomendado = potenciaTotalInstalada * 0.9;
    const ahorroMensualCalc = ((potenciaTotalInstalada * HSP_DEFAULT * 30) / 1.2) * tarifaLuz;
    const costoEstimadoSistema = (potenciaTotalInstalada * 1000) * COSTO_INSTALACION_W;

    setResultados({
      paneles: numeroPaneles, potenciaSistema: potenciaTotalInstalada, inversorRecomendado: inversorRecomendado,
      ahorroMensual: ahorroMensualCalc, costoEstimado: costoEstimadoSistema, roiMeses: costoEstimadoSistema / ahorroMensualCalc
    });
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    subText: { color: isDark ? "#94A3B8" : "#64748B" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
      <TouchableOpacity style={styles.pdfButton} onPress={escanearRecibo}>
        <Ionicons name="document-attach" size={24} color="#FFF" />
        <Text style={styles.pdfButtonText}>Escanear Recibo (Auto-completar)</Text>
      </TouchableOpacity>

      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.title, dynamicStyles.text]}>Datos del Proyecto</Text>
        <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 12}]} keyboardType="numeric" value={consumoMensual} onChangeText={setConsumoMensual} placeholder="Consumo (kWh)" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        <View style={styles.row}>
          <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} keyboardType="numeric" value={potenciaPanel} onChangeText={setPotenciaPanel} placeholder="Potencia Panel (W)" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
          <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} keyboardType="numeric" value={porcentajeAhorro} onChangeText={setPorcentajeAhorro} placeholder="% Ahorro" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
        <TouchableOpacity style={styles.button} onPress={calcularSistema}>
          <Text style={styles.buttonText}>Calcular</Text>
        </TouchableOpacity>
      </View>

      {resultados && (
        <View style={[styles.resultsCard, dynamicStyles.card]}>
          <Text style={[styles.resultsTitle, dynamicStyles.text]}>Resultados</Text>
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• Paneles: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.paneles}</Text></Text>
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• Potencia: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.potenciaSistema.toFixed(2)} kW</Text></Text>
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• Inversor Mínimo: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.inversorRecomendado.toFixed(2)} kW</Text></Text>
          <View style={{ height: 1, backgroundColor: "#CBD5E1", marginVertical: 12 }} />
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• Ahorro Mensual: <Text style={{fontWeight: 'bold', color: '#10B981'}}>${resultados.ahorroMensual.toFixed(2)}</Text></Text>
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• Inversión: <Text style={[styles.bold, dynamicStyles.text]}>${resultados.costoEstimado.toFixed(2)}</Text></Text>
          <Text style={[dynamicStyles.subText, {marginBottom: 6}]}>• ROI: <Text style={[styles.bold, dynamicStyles.text]}>{(resultados.roiMeses / 12).toFixed(1)} años</Text></Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  pdfButton: { backgroundColor: "#8B5CF6", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pdfButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#0EA5E9", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  resultsCard: { marginTop: 20, padding: 20, borderRadius: 12, borderWidth: 1 },
  resultsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  bold: { fontWeight: "bold" }
});