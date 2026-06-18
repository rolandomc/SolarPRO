import React, { useState, useContext, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { generarCotizacionProfesional, ItemCotizacion } from "../utils/pdfGenerator";

export default function Quotes() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams();

  const [isPro, setIsPro] = useState(false);
  const [cotizacionId, setCotizacionId] = useState<string | null>(null);
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [desc, setDesc] = useState("");
  const [cant, setCant] = useState("");
  const [prec, setPrec] = useState("");

  useEffect(() => {
    // Recibir datos desde PRO calculator
    if (params.clienteParam) {
      setIsPro(true);
      setCliente(String(params.clienteParam));
      if (params.itemsParam) {
        try {
          const itemsParsed: ItemCotizacion[] = JSON.parse(String(params.itemsParam));
          setItems(itemsParsed);
        } catch (_) {}
      }
      setCotizacionId(null);
      return;
    }
    // Editar cotización existente desde historial
    if (params.editId) {
      setIsPro(true);
      const cargarCotizacion = async () => {
        try {
          const data = await AsyncStorage.getItem("historialCotizaciones");
          if (data) {
            const historial = JSON.parse(data);
            const cotizacion = historial.find((c: any) => c.id === params.editId);
            if (cotizacion) {
              setCotizacionId(cotizacion.id);
              setCliente(cotizacion.cliente);
              setItems(cotizacion.items || []);
            }
          }
        } catch (error) {}
      };
      cargarCotizacion();
    } else {
      setCotizacionId(null); setCliente(""); setItems([]);
    }
  }, [params.editId, params.clienteParam]);

  const limpiarFormulario = () => {
    setCotizacionId(null); setCliente(""); setItems([]); setDesc(""); setCant(""); setPrec("");
    router.setParams({ editId: "", clienteParam: "", itemsParam: "" });
  };

  const agregarItem = () => {
    if (desc && cant && prec) {
      setItems([...items, { id: Math.random().toString(), descripcion: desc, cantidad: cant, precio: prec }]);
      setDesc(""); setCant(""); setPrec("");
    } else {
      Alert.alert("Atención", "Llena todos los campos.");
    }
  };

  const eliminarItem = (id: string) => setItems(items.filter(item => item.id !== id));
  const calcularTotal = () => items.reduce((total, item) => total + (parseFloat(item.cantidad) * parseFloat(item.precio)), 0);

  const procesarCotizacion = async () => {
    if (!cliente || items.length === 0) return Alert.alert("Faltan datos", "Agrega cliente y componentes.");
    try {
      const perfilGuardado = await AsyncStorage.getItem("perfilEmpresa");
      const perfil = perfilGuardado ? JSON.parse(perfilGuardado) : null;
      await generarCotizacionProfesional(cliente, items, calcularTotal(), perfil);
      const historialGuardado = await AsyncStorage.getItem("historialCotizaciones");
      let historial = historialGuardado ? JSON.parse(historialGuardado) : [];
      const nuevaCotizacion = {
        id: cotizacionId || Date.now().toString(),
        cliente, items, total: calcularTotal(), fecha: new Date().toLocaleDateString(),
      };
      if (cotizacionId) {
        historial = historial.map((c: any) => c.id === cotizacionId ? nuevaCotizacion : c);
        Alert.alert("Éxito", "Cotización actualizada.");
      } else {
        historial.push(nuevaCotizacion);
      }
      await AsyncStorage.setItem("historialCotizaciones", JSON.stringify(historial));
      limpiarFormulario();
    } catch (error) {
      Alert.alert("Error", "No se pudo generar la cotización.");
    }
  };

  const ds = {
    bg:    { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text:  { color: isDark ? "#F1F5F9" : "#0F172A" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card:  { backgroundColor: isDark ? "#1E293B" : "#FFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, ds.bg]} edges={["top", "left", "right"]}>
      <View style={[styles.container, ds.bg]}>

        <View style={styles.headerRow}>
          <Text style={[styles.title, ds.text]}>{cotizacionId ? "Editar Cotización" : "Nueva Cotización"}</Text>
          {(cotizacionId || cliente) && (
            <TouchableOpacity onPress={limpiarFormulario} style={styles.cancelButton}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={[styles.input, ds.input, { marginBottom: 16 }]}
          placeholder="Nombre del Cliente"
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          value={cliente}
          onChangeText={setCliente}
        />

        <View style={[styles.addCard, ds.card]}>
          <TextInput style={[styles.input, ds.input, { marginBottom: 10 }]} placeholder="Descripción" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={desc} onChangeText={setDesc} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TextInput style={[styles.input, ds.input, { width: "48%" }]} placeholder="Cant." keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cant} onChangeText={setCant} />
            <TextInput style={[styles.input, ds.input, { width: "48%" }]} placeholder="Precio" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={prec} onChangeText={setPrec} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={agregarItem}>
            <Text style={{ color: "#FFF", fontWeight: "bold" }}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          style={{ marginTop: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, ds.card]}>
              <View style={{ flex: 1 }}>
                <Text style={[ds.text, { fontWeight: "bold" }]}>{item.descripcion}</Text>
                <Text style={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 12 }}>{item.cantidad} x ${item.precio}</Text>
              </View>
              <Text style={[ds.text, { fontWeight: "bold", marginRight: 15 }]}>${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</Text>
              <TouchableOpacity onPress={() => eliminarItem(item.id)}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />

        <View style={[styles.footer, { borderColor: isDark ? "#334155" : "#CBD5E1" }]}>
          <Text style={[styles.totalText, { color: "#0EA5E9" }]}>Total: ${calcularTotal().toFixed(2)}</Text>
          <TouchableOpacity style={styles.pdfButton} onPress={procesarCotizacion}>
            <Ionicons name="save-outline" size={24} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "bold", marginLeft: 8 }}>
              {cotizacionId ? "Actualizar" : "Generar PDF"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isPro && (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
            <Ionicons name="lock-closed" size={80} color="#0EA5E9" />
            <Text style={{ fontSize: 24, fontWeight: "bold", color: isDark ? "#FFF" : "#0F172A", marginVertical: 10 }}>PRO</Text>
            <TouchableOpacity style={{ backgroundColor: "#0EA5E9", padding: 15, borderRadius: 30 }} onPress={() => setIsPro(true)}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Desbloquear</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 20 },
  headerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:        { fontSize: 20, fontWeight: "bold" },
  cancelButton: { backgroundColor: "#EF4444", padding: 8, borderRadius: 6 },
  input:        { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  addCard:      { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  addButton:    { backgroundColor: "#10B981", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  itemRow:      { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  footer:       { marginTop: 10, borderTopWidth: 1, paddingTop: 16 },
  totalText:    { fontSize: 22, fontWeight: "bold", textAlign: "right", marginBottom: 16 },
  pdfButton:    { backgroundColor: "#0EA5E9", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
