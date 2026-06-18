import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";

export default function Index() {
  const { isDark } = useContext(ThemeContext);

  // Estados anteriores
  const [consumoMensual, setConsumoMensual] = useState("");
  const [horasSolPico, setHorasSolPico] = useState("");
  const [potenciaPanel, setPotenciaPanel] = useState("");
  
  // Nuevos estados para Ahorro y ROI
  const [porcentajeAhorro, setPorcentajeAhorro] = useState("100");
  const [tarifaLuz, setTarifaLuz] = useState("2.50"); // Costo por kWh
  const [costoInstalacionW, setCostoInstalacionW] = useState("20"); // Costo estimado por Watt instalado
  
  const [resultados, setResultados] = useState<{
    paneles: number;
    potenciaSistema: number;
    inversorRecomendado: number;
    ahorroMensual: number;
    costoEstimado: number;
    roiMeses: number;
  } | null>(null);

  const calcularSistema = () => {
    const consumo = parseFloat(consumoMensual);
    const hsp = parseFloat(horasSolPico);
    const panelW = parseFloat(potenciaPanel);
    const ahorroEsperado = parseFloat(porcentajeAhorro) / 100;
    const tarifa = parseFloat(tarifaLuz);
    const costoW = parseFloat(costoInstalacionW);

    if (isNaN(consumo) || isNaN(hsp) || isNaN(panelW) || hsp <= 0 || panelW <= 0) {
      return; 
    }

    // Cálculos técnicos (se añade el factor de porcentaje de ahorro)
    const consumoDiario = consumo / 30;
    const energiaRequerida = (consumoDiario * 1.2) * ahorroEsperado; // Solo generamos lo que se quiere ahorrar
    const potenciaArregloKW = energiaRequerida / hsp;
    const potenciaArregloW = potenciaArregloKW * 1000;
    const numeroPaneles = Math.ceil(potenciaArregloW / panelW);
    const potenciaTotalInstalada = (numeroPaneles * panelW) / 1000;
    const inversorRecomendado = potenciaTotalInstalada * 0.9;

    // Cálculos Financieros (ROI)
    const energiaMensualGenerada = (potenciaTotalInstalada * hsp * 30) / 1.2;
    const ahorroMensualCalc = energiaMensualGenerada * tarifa;
    const costoEstimadoSistema = (potenciaTotalInstalada * 1000) * costoW;
    const roiMesesCalc = costoEstimadoSistema / ahorroMensualCalc;

    setResultados({
      paneles: numeroPaneles,
      potenciaSistema: potenciaTotalInstalada,
      inversorRecomendado: inversorRecomendado,
      ahorroMensual: ahorroMensualCalc,
      costoEstimado: costoEstimadoSistema,
      roiMeses: roiMesesCalc
    });
  };

  // Estilos dinámicos basados en el tema
  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    subText: { color: isDark ? "#94A3B8" : "#64748B" },
    input: { 
      backgroundColor: isDark ? "#1E293B" : "#FFFFFF", 
      borderColor: isDark ? "#334155" : "#CBD5E1",
      color: isDark ? "#F8FAFC" : "#0F172A" 
    },
    card: { 
      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
      borderColor: isDark ? "#334155" : "#E2E8F0"
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
      
      {/* Botón para subir PDF (Simulación OCR Futuro) */}
      <TouchableOpacity style={styles.pdfButton}>
        <Ionicons name="document-attach" size={24} color="#FFF" />
        <Text style={styles.pdfButtonText}>Subir Recibo PDF (Auto-completar)</Text>
      </TouchableOpacity>

      <Text style={[styles.title, dynamicStyles.text]}>Parámetros Técnicos</Text>

      <View style={styles.row}>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>Consumo (kWh/mes):</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={consumoMensual} onChangeText={setConsumoMensual} placeholder="Ej. 500" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>HSP:</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={horasSolPico} onChangeText={setHorasSolPico} placeholder="Ej. 5.5" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>Potencia Panel (W):</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={potenciaPanel} onChangeText={setPotenciaPanel} placeholder="Ej. 550" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>% Ahorro Deseado:</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={porcentajeAhorro} onChangeText={setPorcentajeAhorro} placeholder="Ej. 100" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
      </View>

      <Text style={[styles.title, dynamicStyles.text, {marginTop: 20}]}>Parámetros Financieros (ROI)</Text>
      <View style={styles.row}>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>Tarifa Luz ($/kWh):</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={tarifaLuz} onChangeText={setTarifaLuz} placeholder="2.50" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
        <View style={styles.inputGroupHalf}>
          <Text style={[styles.label, dynamicStyles.text]}>Costo Inst. ($/W):</Text>
          <TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={costoInstalacionW} onChangeText={setCostoInstalacionW} placeholder="20" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={calcularSistema}>
        <Text style={styles.buttonText}>Calcular Dimensionamiento y ROI</Text>
      </TouchableOpacity>

      {/* Tarjeta de Resultados */}
      {resultados && (
        <View style={[styles.resultsCard, dynamicStyles.card]}>
          <Text style={[styles.resultsTitle, dynamicStyles.text]}>Resultados del Proyecto</Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Paneles Requeridos: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.paneles} pzas</Text></Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Potencia Instalada: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.potenciaSistema.toFixed(2)} kW</Text></Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Inversor Mínimo: <Text style={[styles.bold, dynamicStyles.text]}>{resultados.inversorRecomendado.toFixed(2)} kW</Text></Text>
          
          <View style={styles.divider} />
          
          <Text style={[styles.resultsTitle, dynamicStyles.text]}>Análisis Financiero</Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Ahorro Mensual Est.: <Text style={{fontWeight: 'bold', color: '#10B981'}}>${resultados.ahorroMensual.toFixed(2)}</Text></Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Inversión Aproximada: <Text style={[styles.bold, dynamicStyles.text]}>${resultados.costoEstimado.toFixed(2)}</Text></Text>
          <Text style={[styles.resultText, dynamicStyles.subText]}>• Retorno de Inversión (ROI): <Text style={[styles.bold, dynamicStyles.text]}>{(resultados.roiMeses / 12).toFixed(1)} años ({Math.round(resultados.roiMeses)} meses)</Text></Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  pdfButton: { backgroundColor: "#8B5CF6", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 20, elevation: 4 },
  pdfButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  inputGroupHalf: { width: "48%" },
  label: { fontSize: 14, marginBottom: 6, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#0EA5E9", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 12, elevation: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  resultsCard: { marginTop: 24, padding: 20, borderRadius: 12, borderWidth: 1, elevation: 3 },
  resultsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  resultText: { fontSize: 15, marginBottom: 8 },
  bold: { fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#CBD5E1", marginVertical: 12 }
});