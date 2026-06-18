import React, { useState, useContext } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { ThemeContext } from "./_layout";
import { procesarDocumentoOCR } from "../utils/ocrService";

export default function Index() {
  const { isDark } = useContext(ThemeContext);

  const [consumoMensual, setConsumoMensual] = useState("");
  const [potenciaPanel, setPotenciaPanel] = useState("");
  const [porcentajeAhorro, setPorcentajeAhorro] = useState("100");
  const [tarifaLuz] = useState(2.50);
  const HSP_DEFAULT = 5.5;
  const COSTO_INSTALACION_W = 20;
  const [resultados, setResultados] = useState<any>(null);
  const [datosOCR, setDatosOCR] = useState<any>(null);

  const escanearRecibo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        Alert.alert("Analizando", "Procesando documento CFE...");
        const file = result.assets[0];
        const respuestaOCR = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");

        if (!respuestaOCR.exito) {
          Alert.alert("Error OCR", respuestaOCR.error);
          return;
        }

        if (respuestaOCR.consumo) {
          setConsumoMensual(respuestaOCR.consumo);
          setDatosOCR(respuestaOCR);
        } else {
          Alert.alert("Revision manual", "No se encontro el consumo en el formato esperado.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Fallo en la seleccion del archivo.");
    }
  };

  const calcularSistema = () => {
    const consumo = parseFloat(consumoMensual);
    const panelW = parseFloat(potenciaPanel);
    const ahorroEsperado = parseFloat(porcentajeAhorro) / 100;

    if (isNaN(consumo) || isNaN(panelW) || panelW <= 0)
      return Alert.alert("Error", "Datos incompletos.");

    const consumoDiario = consumo / 30;
    const energiaRequerida = consumoDiario * 1.2 * ahorroEsperado;
    const potenciaArregloKW = energiaRequerida / HSP_DEFAULT;
    const numeroPaneles = Math.ceil((potenciaArregloKW * 1000) / panelW);
    const potenciaTotalInstalada = (numeroPaneles * panelW) / 1000;
    const inversorRecomendado = potenciaTotalInstalada * 0.9;
    const ahorroMensualCalc = ((potenciaTotalInstalada * HSP_DEFAULT * 30) / 1.2) * tarifaLuz;
    const costoEstimadoSistema = potenciaTotalInstalada * 1000 * COSTO_INSTALACION_W;

    setResultados({
      paneles: numeroPaneles,
      potenciaSistema: potenciaTotalInstalada,
      inversorRecomendado,
      ahorroMensual: ahorroMensualCalc,
      costoEstimado: costoEstimadoSistema,
      roiMeses: costoEstimadoSistema / ahorroMensualCalc,
    });
  };

  const ds = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text:    { color: isDark ? "#F1F5F9" : "#0F172A" },
    subText: { color: isDark ? "#94A3B8" : "#64748B" },
    input:   { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card:    { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
    ocrCard: { backgroundColor: isDark ? "#0F2A1A" : "#F0FDF4", borderColor: isDark ? "#166534" : "#86EFAC" },
  };

  return (
    <SafeAreaView style={[styles.safeArea, ds.container]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={[styles.container, ds.container]}>

        {/* Boton escanear */}
        <TouchableOpacity style={styles.pdfButton} onPress={escanearRecibo}>
          <Ionicons name="document-attach" size={24} color="#FFF" />
          <Text style={styles.pdfButtonText}>Escanear Recibo CFE</Text>
        </TouchableOpacity>

        {/* Tarjeta resumen OCR - visible tras escaneo */}
        {datosOCR && (
          <View style={[styles.card, ds.ocrCard, { marginBottom: 16 }]}>
            <View style={styles.ocrHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.ocrTitle, { color: "#10B981" }]}>  Datos extraidos del recibo</Text>
            </View>
            {datosOCR.cliente ? (
              <Text style={[styles.ocrRow, ds.subText]}>Cliente: <Text style={[styles.bold, ds.text]}>{datosOCR.cliente}</Text></Text>
            ) : null}
            <Text style={[styles.ocrRow, ds.subText]}>Metodo: <Text style={[styles.bold, ds.text]}>{datosOCR.mensaje}</Text></Text>

            {/* Tabla de bimestres si existen */}
            {datosOCR.bimestres && datosOCR.bimestres.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.bold, ds.text, { marginBottom: 6 }]}>Bimestres detectados:</Text>
                {datosOCR.bimestres.map((b: any, i: number) => (
                  <View key={i} style={styles.bimestreRow}>
                    <Text style={[ds.subText, { flex: 1 }]}>{b.periodo}</Text>
                    <Text style={[styles.bold, ds.text]}>{b.kwh} kWh</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.bimestreRow}>
                  <Text style={[styles.bold, ds.text, { flex: 1 }]}>Promedio mensual:</Text>
                  <Text style={{ fontWeight: "bold", color: "#10B981", fontSize: 16 }}>
                    {consumoMensual} kWh
                  </Text>
                </View>
              </View>
            )}

            {/* Si no hay bimestres detallados, mostrar solo el consumo */}
            {(!datosOCR.bimestres || datosOCR.bimestres.length === 0) && (
              <Text style={[styles.ocrRow, ds.subText]}>
                Consumo mensual estimado:{" "}
                <Text style={{ fontWeight: "bold", color: "#10B981" }}>{consumoMensual} kWh</Text>
              </Text>
            )}
          </View>
        )}

        {/* Formulario */}
        <View style={[styles.card, ds.card]}>
          <Text style={[styles.title, ds.text]}>Datos del Proyecto</Text>
          <TextInput
            style={[styles.input, ds.input, { marginBottom: 12 }]}
            keyboardType="numeric"
            value={consumoMensual}
            onChangeText={setConsumoMensual}
            placeholder="Consumo mensual (kWh)"
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, ds.input, { width: "48%" }]}
              keyboardType="numeric"
              value={potenciaPanel}
              onChangeText={setPotenciaPanel}
              placeholder="Potencia Panel (W)"
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            />
            <TextInput
              style={[styles.input, ds.input, { width: "48%" }]}
              keyboardType="numeric"
              value={porcentajeAhorro}
              onChangeText={setPorcentajeAhorro}
              placeholder="% Ahorro"
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={calcularSistema}>
            <Text style={styles.buttonText}>Calcular</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados */}
        {resultados && (
          <View style={[styles.resultsCard, ds.card]}>
            <Text style={[styles.resultsTitle, ds.text]}>Resultados</Text>
            <Text style={[ds.subText, { marginBottom: 6 }]}>• Paneles: <Text style={[styles.bold, ds.text]}>{resultados.paneles}</Text></Text>
            <Text style={[ds.subText, { marginBottom: 6 }]}>• Potencia: <Text style={[styles.bold, ds.text]}>{resultados.potenciaSistema.toFixed(2)} kW</Text></Text>
            <Text style={[ds.subText, { marginBottom: 6 }]}>• Inversor Minimo: <Text style={[styles.bold, ds.text]}>{resultados.inversorRecomendado.toFixed(2)} kW</Text></Text>
            <View style={styles.divider} />
            <Text style={[ds.subText, { marginBottom: 6 }]}>• Ahorro Mensual: <Text style={{ fontWeight: "bold", color: "#10B981" }}>${resultados.ahorroMensual.toFixed(2)}</Text></Text>
            <Text style={[ds.subText, { marginBottom: 6 }]}>• Inversion: <Text style={[styles.bold, ds.text]}>${resultados.costoEstimado.toFixed(2)}</Text></Text>
            <Text style={[ds.subText, { marginBottom: 6 }]}>• ROI: <Text style={[styles.bold, ds.text]}>{(resultados.roiMeses / 12).toFixed(1)} anos</Text></Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1 },
  container:    { flexGrow: 1, padding: 20 },
  pdfButton:    { backgroundColor: "#8B5CF6", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  pdfButtonText:{ color: "#FFF", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  card:         { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  title:        { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  row:          { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  input:        { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button:       { backgroundColor: "#0EA5E9", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 12 },
  buttonText:   { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  resultsCard:  { marginTop: 16, padding: 20, borderRadius: 12, borderWidth: 1 },
  resultsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  bold:         { fontWeight: "bold" },
  divider:      { height: 1, backgroundColor: "#CBD5E1", marginVertical: 10 },
  ocrHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ocrTitle:     { fontSize: 15, fontWeight: "bold" },
  ocrRow:       { marginBottom: 4, fontSize: 13 },
  bimestreRow:  { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
});
