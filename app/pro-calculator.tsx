// app/pro-calculator.tsx
import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";
import { procesarDocumentoOCR } from "../utils/ocrService";
import { obtenerHSPDesdeNasa, calcularProtecciones } from "../utils/engineering";
import { PANELES_DB, INVERSORES_DB } from "../data/componentsDB";
import { useRouter } from "expo-router";

export default function ProCalculator() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [consumo, setConsumo] = useState("");
  const [hsp, setHsp] = useState("");
  const [panelSelId, setPanelSelId] = useState(PANELES_DB[0].id);
  const [inversorSelId, setInversorSelId] = useState(INVERSORES_DB[0].id);
  const [resultados, setResultados] = useState<any>(null);

  const escanearReciboPRO = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf"], copyToCacheDirectory: true });
      if (!result.canceled) {
        Alert.alert("Analizando (PRO)", "Extrayendo historial anual y datos del cliente...");
        const file = result.assets[0];
        const respuesta = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");

        if (respuesta.exito) {
          if (respuesta.consumoPromedio) setConsumo(respuesta.consumoPromedio.toString());
          if (respuesta.cliente) setCliente(respuesta.cliente);
          Alert.alert("Extracción Completa", `${respuesta.mensaje}\n\nCliente: ${respuesta.cliente}\nPromedio Mensual: ${respuesta.consumoPromedio} kWh`);
        }
      }
    } catch (error) { Alert.alert("Error", "Fallo al leer PDF."); }
  };

  const obtenerGPSyNASA = async () => {
    Alert.alert("Obteniendo Datos", "Conectando con GPS y NASA POWER...");
    const res = await obtenerHSPDesdeNasa();
    if (res.exito && res.hsp) {
      setHsp(res.hsp.toFixed(2).toString());
      Alert.alert("Éxito", `HSP Promedio Anual: ${res.hsp.toFixed(2)}\nLat: ${res.lat.toFixed(4)}, Lon: ${res.lon.toFixed(4)}`);
    } else {
      Alert.alert("Error", res.error);
    }
  };

  const calcularProyecto = () => {
    const cons = parseFloat(consumo);
    const hspNum = parseFloat(hsp);
    const panel = PANELES_DB.find(p => p.id === panelSelId);
    const inversor = INVERSORES_DB.find(i => i.id === inversorSelId);

    if (isNaN(cons) || isNaN(hspNum) || !panel || !inversor) return Alert.alert("Faltan datos");

    // Cálculo Fotovoltaico Básico
    const energiaDiaria = (cons / 30) * 1.2; // 20% pérdidas
    const potenciaArregloW = (energiaDiaria / hspNum) * 1000;
    const numPaneles = Math.ceil(potenciaArregloW / panel.pmax);
    const potenciaKW = (numPaneles * panel.pmax) / 1000;

    // Validación de Inversor
    let alertaInversor = "";
    if (potenciaKW * 1000 > inversor.max_dc_input) alertaInversor = "⚠️ Inversor subdimensionado (Excede límite CC)";
    
    // Ingeniería Eléctrica
    const protecciones = calcularProtecciones(panel, inversor, numPaneles);

    setResultados({
      numPaneles, potenciaKW, inversor: inversor.modelo,
      alertaInversor, protecciones, panelObj: panel, invObj: inversor
    });
  };

  const enviarACotizacion = () => {
    if (!cliente || !resultados) return Alert.alert("Calcula primero");
    // Pasamos datos básicos al módulo de cotización (esto requeriría usar Zustand/Context, 
    // pero por ahora podemos alertarlo como flujo exitoso)
    Alert.alert("Flujo Integrado", `Los datos de ${cliente} y el sistema de ${resultados.potenciaKW}kW están listos para enviarse a Cotizaciones.`);
  };

  const dynStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }, text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  return (
    <ScrollView style={dynStyles.container}>
      <View style={styles.container}>
        <Text style={[styles.title, dynStyles.text]}>Dimensionamiento Profesional</Text>

        {/* Botones de Extracción Inteligente */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#8B5CF6'}]} onPress={escanearReciboPRO}>
            <Ionicons name="document-text" size={20} color="#FFF" /><Text style={styles.btnText}>Recibo PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F59E0B'}]} onPress={obtenerGPSyNASA}>
            <Ionicons name="satellite" size={20} color="#FFF" /><Text style={styles.btnText}>HSP NASA</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={[styles.card, dynStyles.card]}>
          <TextInput style={[styles.input, dynStyles.input, {marginBottom:10}]} placeholder="Cliente / Dirección" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cliente} onChangeText={setCliente} />
          <View style={styles.row}>
            <TextInput style={[styles.input, dynStyles.input, {width: '48%'}]} placeholder="Consumo Anual/Mensual" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={consumo} onChangeText={setConsumo} />
            <TextInput style={[styles.input, dynStyles.input, {width: '48%'}]} placeholder="HSP (Zona)" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={hsp} onChangeText={setHsp} />
          </View>

          <Text style={[styles.label, dynStyles.text, {marginTop: 10}]}>Selección de Panel:</Text>
          <View style={[styles.pickerContainer, {borderColor: isDark ? "#334155" : "#CBD5E1"}]}>
            <Picker selectedValue={panelSelId} style={{color: isDark ? "#F8FAFC" : "#000"}} onValueChange={setPanelSelId}>
              {PANELES_DB.map(p => <Picker.Item key={p.id} label={`${p.marca} ${p.modelo}`} value={p.id} />)}
            </Picker>
          </View>

          <Text style={[styles.label, dynStyles.text]}>Selección de Inversor:</Text>
          <View style={[styles.pickerContainer, {borderColor: isDark ? "#334155" : "#CBD5E1"}]}>
            <Picker selectedValue={inversorSelId} style={{color: isDark ? "#F8FAFC" : "#000"}} onValueChange={setInversorSelId}>
              {INVERSORES_DB.map(i => <Picker.Item key={i.id} label={`${i.marca} ${i.modelo}`} value={i.id} />)}
            </Picker>
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={calcularProyecto}>
            <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>Ejecutar Ingeniería</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados Avanzados */}
        {resultados && (
          <View style={[styles.card, dynStyles.card, {marginTop: 20}]}>
            <Text style={[styles.title, dynStyles.text, {color: '#10B981'}]}>Memoria de Cálculo</Text>
            
            <Text style={[dynStyles.text, {fontWeight: 'bold', fontSize: 16, marginBottom: 5}]}>Sistema Solar:</Text>
            <Text style={dynStyles.text}>• {resultados.numPaneles} x Paneles {resultados.panelObj.pmax}W</Text>
            <Text style={dynStyles.text}>• Potencia Total: {resultados.potenciaKW.toFixed(2)} kWp</Text>
            <Text style={dynStyles.text}>• Inversor: {resultados.inversor}</Text>
            {resultados.alertaInversor ? <Text style={{color: '#EF4444', fontWeight: 'bold', marginTop: 5}}>{resultados.alertaInversor}</Text> : null}
            
            <View style={{height: 1, backgroundColor: '#CBD5E1', marginVertical: 15}} />
            
            <Text style={[dynStyles.text, {fontWeight: 'bold', fontSize: 16, marginBottom: 5}]}>Protecciones Lado CC (Paneles):</Text>
            <Text style={dynStyles.text}>• Voltaje Voc String: {resultados.protecciones.voltajeSistema} VDC</Text>
            <Text style={dynStyles.text}>• Fusibles sugeridos: {resultados.protecciones.fusibleCC}A</Text>
            <Text style={dynStyles.text}>• Calibre Solar: {resultados.protecciones.cableCC}</Text>

            <View style={{height: 1, backgroundColor: '#CBD5E1', marginVertical: 15}} />

            <Text style={[dynStyles.text, {fontWeight: 'bold', fontSize: 16, marginBottom: 5}]}>Protecciones Lado CA (CFE):</Text>
            <Text style={dynStyles.text}>• Termomagnético (Pastilla): {resultados.protecciones.pastillaCA}A</Text>
            <Text style={dynStyles.text}>• Calibre THW-LS: {resultados.protecciones.cableCA}</Text>

            <TouchableOpacity style={[styles.calcBtn, {backgroundColor: '#0EA5E9', marginTop: 20}]} onPress={enviarACotizacion}>
              <Text style={{color: '#FFF', fontWeight: 'bold'}}>Preparar Cotización Cliente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  actionBtn: { width: "48%", flexDirection: "row", padding: 12, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 5 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 15, overflow: "hidden" },
  calcBtn: { backgroundColor: "#10B981", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 5 }
});