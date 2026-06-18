// app/pro-calculator.tsx
import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, FlatList, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";
import * as DocumentPicker from "expo-document-picker";
import { procesarDocumentoOCR } from "../utils/ocrService";
import { obtenerHSPDesdeNasa, calcularProtecciones } from "../utils/engineering";
import { PANELES_DB, INVERSORES_DB } from "../data/componentsDB";
import { useRouter } from "expo-router";

const sugerirInversor = (potenciaKW: number) => {
  const potenciaW = potenciaKW * 1000;
  const candidatos = INVERSORES_DB.filter(inv => inv.max_dc_input >= potenciaW);
  if (candidatos.length > 0) return candidatos.reduce((prev, curr) => curr.max_dc_input < prev.max_dc_input ? curr : prev);
  return INVERSORES_DB.reduce((prev, curr) => curr.max_dc_input > prev.max_dc_input ? curr : prev);
};

export default function ProCalculator() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [consumo, setConsumo] = useState("");
  const [hsp, setHsp] = useState("");
  const [panelSelId, setPanelSelId] = useState(PANELES_DB[0].id);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultados, setResultados] = useState<any>(null);

  const panelSeleccionado = PANELES_DB.find(p => p.id === panelSelId) || PANELES_DB[0];

  const escanearReciboPRO = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf"], copyToCacheDirectory: true });
      if (!result.canceled) {
        Alert.alert("Analizando", "Extrayendo datos del recibo...");
        const file = result.assets[0];
        const respuesta = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || "application/pdf");
        if (respuesta.exito) {
          if (respuesta.consumo) setConsumo(respuesta.consumo);
          if (respuesta.cliente) setCliente(respuesta.cliente);
        } else {
          Alert.alert("Error OCR", respuesta.error);
        }
      }
    } catch (error) { Alert.alert("Error", "Fallo al leer PDF."); }
  };

  const obtenerGPSyNASA = async () => {
    const res = await obtenerHSPDesdeNasa();
    if (res.exito && res.hsp) {
      setHsp(res.hsp.toFixed(2).toString());
      Alert.alert("HSP obtenido", `${res.hsp.toFixed(2)} horas pico solar`);
    } else {
      Alert.alert("Error", res.error);
    }
  };

  const calcularProyecto = () => {
    const cons = parseFloat(consumo);
    const hspNum = parseFloat(hsp);
    const panel = panelSeleccionado;
    if (isNaN(cons) || isNaN(hspNum)) return Alert.alert("Faltan datos", "Completa consumo y HSP.");

    const energiaDiaria = (cons / 30) * 1.2;
    const potenciaArregloW = (energiaDiaria / hspNum) * 1000;
    const numPaneles = Math.ceil(potenciaArregloW / panel.pmax);
    const potenciaKW = (numPaneles * panel.pmax) / 1000;
    const inversorSugerido = sugerirInversor(potenciaKW);
    const protecciones = calcularProtecciones(panel, inversorSugerido, numPaneles);
    const sobredimensionado = potenciaKW * 1000 > inversorSugerido.max_dc_input;
    const costoPaneles = numPaneles * panel.precio_mxn;
    const costoInversor = inversorSugerido.precio_mxn;
    const costoInstalacion = Math.round(potenciaKW * 1000 * 8);
    const costoTotal = costoPaneles + costoInversor + costoInstalacion;

    setResultados({ numPaneles, potenciaKW, inversor: inversorSugerido, sobredimensionado, protecciones, panelObj: panel, costoPaneles, costoInversor, costoInstalacion, costoTotal });
  };

  const enviarACotizacion = () => {
    if (!resultados) return Alert.alert("Calcula primero");
    const nombreCliente = cliente.trim() || "Cliente";
    const itemsParam = JSON.stringify([
      { id: "1", descripcion: `Panel Solar ${resultados.panelObj.marca} ${resultados.panelObj.modelo}`, cantidad: String(resultados.numPaneles), precio: String(resultados.panelObj.precio_mxn) },
      { id: "2", descripcion: `Inversor ${resultados.inversor.marca} ${resultados.inversor.modelo}`, cantidad: "1", precio: String(resultados.inversor.precio_mxn) },
      { id: "3", descripcion: `Instalacion sistema ${resultados.potenciaKW.toFixed(2)} kWp`, cantidad: "1", precio: String(resultados.costoInstalacion) },
    ]);
    router.push({ pathname: "/quotes", params: { clienteParam: nombreCliente, itemsParam } });
  };

  const ds = {
    bg:    { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text:  { color: isDark ? "#F1F5F9" : "#0F172A" },
    sub:   { color: isDark ? "#94A3B8" : "#64748B" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#000" },
    card:  { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
    modal: { backgroundColor: isDark ? "#1E293B" : "#FFF" },
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, ds.bg]} edges={["top", "left", "right"]}>
      <ScrollView style={ds.bg}>
        <View style={styles.container}>
          <Text style={[styles.title, ds.text]}>Dimensionamiento Profesional</Text>

          {/* Botones accion */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]} onPress={escanearReciboPRO}>
              <Ionicons name="document-text" size={20} color="#FFF" />
              <Text style={styles.btnText}>Recibo PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]} onPress={obtenerGPSyNASA}>
              <Ionicons name="radio-outline" size={20} color="#FFF" />
              <Text style={styles.btnText}>HSP NASA</Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={[styles.card, ds.card]}>
            <TextInput
              style={[styles.input, ds.input, { marginBottom: 10 }]}
              placeholder="Cliente / Direccion"
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
              value={cliente} onChangeText={setCliente}
            />
            <View style={styles.row}>
              <TextInput style={[styles.input, ds.input, { width: "48%" }]} placeholder="Consumo mensual kWh" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={consumo} onChangeText={setConsumo} />
              <TextInput style={[styles.input, ds.input, { width: "48%" }]} placeholder="HSP" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={hsp} onChangeText={setHsp} />
            </View>

            {/* Selector de panel - boton que abre modal */}
            <Text style={[styles.label, ds.text, { marginTop: 10 }]}>Panel Solar:</Text>
            <TouchableOpacity style={[styles.panelSelector, ds.card]} onPress={() => setModalVisible(true)}>
              <View style={{ flex: 1 }}>
                <Text style={[ds.text, { fontWeight: "bold", fontSize: 15 }]}>
                  {panelSeleccionado.marca} {panelSeleccionado.modelo}
                </Text>
                <Text style={[ds.sub, { fontSize: 13 }]}>{panelSeleccionado.pmax} W por panel</Text>
              </View>
              <Ionicons name="chevron-down" size={22} color={isDark ? "#94A3B8" : "#64748B"} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.calcBtn} onPress={calcularProyecto}>
              <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 16 }}>Ejecutar Ingenieria</Text>
            </TouchableOpacity>
          </View>

          {/* Resultados */}
          {resultados && (
            <View style={[styles.card, ds.card, { marginTop: 20 }]}>
              <Text style={[styles.title, { color: "#10B981" }]}>Memoria de Calculo</Text>

              <Text style={[styles.sectionLabel, ds.text]}>Arreglo Fotovoltaico</Text>
              <View style={styles.chipsRow}>
                <View style={styles.chip}>
                  <Ionicons name="sunny" size={22} color="#F59E0B" />
                  <Text style={styles.chipNum}>{resultados.numPaneles}</Text>
                  <Text style={styles.chipLabel}>Paneles</Text>
                </View>
                <View style={styles.chip}>
                  <Ionicons name="flash" size={22} color="#0EA5E9" />
                  <Text style={styles.chipNum}>{resultados.potenciaKW.toFixed(2)}</Text>
                  <Text style={styles.chipLabel}>kWp</Text>
                </View>
                <View style={styles.chip}>
                  <Ionicons name="battery-charging" size={22} color="#10B981" />
                  <Text style={styles.chipNum}>{resultados.panelObj.pmax}W</Text>
                  <Text style={styles.chipLabel}>c/panel</Text>
                </View>
              </View>
              <Text style={[ds.sub, { fontSize: 13, marginBottom: 8 }]}>
                {resultados.panelObj.marca} {resultados.panelObj.modelo}
              </Text>

              <View style={styles.divider} />

              <Text style={[styles.sectionLabel, ds.text]}>Inversor Sugerido</Text>
              <View style={[styles.inversorCard, { borderColor: resultados.sobredimensionado ? "#EF4444" : "#10B981" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[ds.text, { fontWeight: "bold", fontSize: 15 }]}>{resultados.inversor.marca} {resultados.inversor.modelo}</Text>
                  <Text style={ds.sub}>CC max: {(resultados.inversor.max_dc_input / 1000).toFixed(1)} kW</Text>
                  <Text style={ds.sub}>Precio: ${resultados.inversor.precio_mxn.toLocaleString()} MXN</Text>
                  {resultados.sobredimensionado
                    ? <Text style={{ color: "#EF4444", fontWeight: "bold", marginTop: 4 }}>Excede capacidad</Text>
                    : <Text style={{ color: "#10B981", marginTop: 4 }}>Dimensionamiento correcto</Text>}
                </View>
                <Ionicons name="hardware-chip" size={36} color={resultados.sobredimensionado ? "#EF4444" : "#10B981"} />
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionLabel, ds.text]}>Protecciones CC</Text>
              <Text style={ds.sub}>  Voltaje Voc String: {resultados.protecciones.voltajeSistema} VDC</Text>
              <Text style={ds.sub}>  Fusibles: {resultados.protecciones.fusibleCC}A</Text>
              <Text style={ds.sub}>  Calibre Solar: {resultados.protecciones.cableCC}</Text>
              <Text style={[styles.sectionLabel, ds.text, { marginTop: 12 }]}>Protecciones CA</Text>
              <Text style={ds.sub}>  Termomag: {resultados.protecciones.pastillaCA}A</Text>
              <Text style={ds.sub}>  Calibre THW-LS: {resultados.protecciones.cableCA}</Text>

              <View style={styles.divider} />

              <Text style={[styles.sectionLabel, ds.text]}>Estimado de Costos</Text>
              <View style={styles.costoRow}>
                <Text style={ds.sub}>Paneles ({resultados.numPaneles} x ${resultados.panelObj.precio_mxn.toLocaleString()})</Text>
                <Text style={[ds.text, { fontWeight: "bold" }]}>${resultados.costoPaneles.toLocaleString()}</Text>
              </View>
              <View style={styles.costoRow}>
                <Text style={ds.sub}>Inversor</Text>
                <Text style={[ds.text, { fontWeight: "bold" }]}>${resultados.costoInversor.toLocaleString()}</Text>
              </View>
              <View style={styles.costoRow}>
                <Text style={ds.sub}>Instalacion y materiales</Text>
                <Text style={[ds.text, { fontWeight: "bold" }]}>${resultados.costoInstalacion.toLocaleString()}</Text>
              </View>
              <View style={[styles.costoRow, { borderTopWidth: 1, borderColor: "#CBD5E1", marginTop: 6, paddingTop: 8 }]}>
                <Text style={[ds.text, { fontWeight: "bold", fontSize: 16 }]}>TOTAL ESTIMADO</Text>
                <Text style={{ fontWeight: "bold", fontSize: 18, color: "#10B981" }}>${resultados.costoTotal.toLocaleString()}</Text>
              </View>

              <TouchableOpacity style={[styles.calcBtn, { backgroundColor: "#0EA5E9", marginTop: 20 }]} onPress={enviarACotizacion}>
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <Text style={{ color: "#FFF", fontWeight: "bold", marginLeft: 8, fontSize: 15 }}>Preparar Cotizacion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal selector de paneles */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, ds.modal]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.title, ds.text, { marginBottom: 0 }]}>Seleccionar Panel</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={isDark ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PANELES_DB}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const seleccionado = item.id === panelSelId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.panelItem,
                      { borderColor: seleccionado ? "#0EA5E9" : (isDark ? "#334155" : "#E2E8F0"),
                        backgroundColor: seleccionado ? "rgba(14,165,233,0.1)" : (isDark ? "#0F172A" : "#F8FAFC") }
                    ]}
                    onPress={() => { setPanelSelId(item.id); setModalVisible(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[ds.text, { fontWeight: "bold", fontSize: 15 }]}>
                        {item.marca}
                      </Text>
                      <Text style={ds.sub}>{item.modelo}</Text>
                    </View>
                    <View style={styles.panelWatts}>
                      <Text style={styles.panelWattsNum}>{item.pmax}</Text>
                      <Text style={styles.panelWattsLabel}>W</Text>
                    </View>
                    {seleccionado && <Ionicons name="checkmark-circle" size={24} color="#0EA5E9" style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: 20, paddingBottom: 50 },
  title:          { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  sectionLabel:   { fontSize: 15, fontWeight: "bold", marginBottom: 8 },
  actionRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  actionBtn:      { width: "48%", flexDirection: "row", padding: 12, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnText:        { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  card:           { padding: 20, borderRadius: 12, borderWidth: 1 },
  row:            { flexDirection: "row", justifyContent: "space-between" },
  input:          { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  label:          { fontSize: 14, fontWeight: "bold", marginBottom: 5 },
  calcBtn:        { backgroundColor: "#10B981", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 10, flexDirection: "row", justifyContent: "center" },
  panelSelector:  { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 15 },
  chipsRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  chip:           { flex: 1, alignItems: "center", backgroundColor: "rgba(14,165,233,0.08)", borderRadius: 10, padding: 12, marginHorizontal: 4 },
  chipNum:        { fontSize: 20, fontWeight: "bold", color: "#0EA5E9", marginTop: 4 },
  chipLabel:      { fontSize: 12, color: "#64748B", marginTop: 2 },
  inversorCard:   { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: 10, padding: 14, marginBottom: 8 },
  divider:        { height: 1, backgroundColor: "#CBD5E1", marginVertical: 14 },
  costoRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  panelItem:      { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 10 },
  panelWatts:     { alignItems: "center", marginLeft: 8 },
  panelWattsNum:  { fontSize: 22, fontWeight: "bold", color: "#0EA5E9" },
  panelWattsLabel:{ fontSize: 11, color: "#64748B" },
});
