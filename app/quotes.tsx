import React, { useState, useContext, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";
import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

interface Item { id: string; descripcion: string; cantidad: string; precio: string; }

export default function Quotes() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const [isPro, setIsPro] = useState(false); 
  const [cotizacionId, setCotizacionId] = useState<string | null>(null);
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [desc, setDesc] = useState("");
  const [cant, setCant] = useState("");
  const [prec, setPrec] = useState("");

  // Cargar datos si venimos de "Editar" en el historial
  useEffect(() => {
    const cargarCotizacionParaEditar = async () => {
      if (params.editId) {
        setIsPro(true); // Asumimos que si está editando, es pro
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
        } catch (error) {
          console.log("Error al cargar cotización", error);
        }
      } else {
        // Resetear si entra normal
        setCotizacionId(null);
        setCliente("");
        setItems([]);
      }
    };
    cargarCotizacionParaEditar();
  }, [params.editId]);

  const agregarItem = () => {
    if (desc && cant && prec) {
      setItems([...items, { id: Math.random().toString(), descripcion: desc, cantidad: cant, precio: prec }]);
      setDesc(""); setCant(""); setPrec("");
    } else {
      Alert.alert("Atención", "Llena todos los campos del componente.");
    }
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calcularTotal = () => {
    return items.reduce((total, item) => total + (parseFloat(item.cantidad) * parseFloat(item.precio)), 0);
  };

  const generarYGuardarPDF = async () => {
    if (!cliente || items.length === 0) {
      Alert.alert("Faltan datos", "Agrega un cliente y al menos un componente.");
      return;
    }

    try {
      const filasHTML = items.map(item => `
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
              <h1 style="color: #0EA5E9; margin: 0;">Propuesta de Sistema Solar</h1>
            </div>
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0;">Preparado para: <span style="color: #555;">${cliente}</span></h3>
              <p style="margin: 5px 0 0 0; color: #777;">Fecha: ${new Date().toLocaleDateString()}</p>
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
              <h2>Inversión Total Estimada: <span style="color: #10B981;">$${calcularTotal().toFixed(2)}</span></h2>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);

      // Guardar o Actualizar en el historial
      const historialGuardado = await AsyncStorage.getItem("historialCotizaciones");
      let historial = historialGuardado ? JSON.parse(historialGuardado) : [];
      
      const nuevaCotizacion = {
        id: cotizacionId || Date.now().toString(),
        cliente,
        items, // Guardamos los items para poder editarlos despues
        total: calcularTotal(),
        fecha: new Date().toLocaleDateString(),
      };

      if (cotizacionId) {
        // Actualizar existente
        historial = historial.map((c: any) => c.id === cotizacionId ? nuevaCotizacion : c);
      } else {
        // Agregar nueva
        historial.push(nuevaCotizacion);
      }

      await AsyncStorage.setItem("historialCotizaciones", JSON.stringify(historial));
      
      // Limpiar y regresar si editamos
      if (cotizacionId) {
        router.push("/settings");
      } else {
        setCliente(""); setItems([]);
      }
      
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el documento.");
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    input: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#CBD5E1", color: isDark ? "#F8FAFC" : "#0F172A" },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.container, dynamicStyles.container]}>
        
        <View style={styles.headerRow}>
          <Text style={[styles.title, dynamicStyles.text]}>{cotizacionId ? "Editar Cotización" : "Nueva Cotización"}</Text>
          {cotizacionId && (
            <TouchableOpacity onPress={() => router.push("/settings")} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 16}]} placeholder="Nombre del Cliente" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cliente} onChangeText={setCliente} />

        <View style={[styles.card, dynamicStyles.card, {padding: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1}]}>
          <Text style={[styles.label, dynamicStyles.text]}>Agregar Partida</Text>
          <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 10}]} placeholder="Ej. Panel Solar 550W Canadian Solar" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={desc} onChangeText={setDesc} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} placeholder="Cantidad" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cant} onChangeText={setCant} />
            <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} placeholder="Precio Unitario" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={prec} onChangeText={setPrec} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={agregarItem}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.addButtonText}>Añadir a la lista</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={{textAlign: 'center', color: isDark ? "#64748B" : "#94A3B8", marginTop: 20}}>No hay ítems agregados.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, dynamicStyles.card]}>
              <View style={{flex: 1}}>
                <Text style={[dynamicStyles.text, {fontWeight: 'bold'}]}>{item.descripcion}</Text>
                <Text style={{color: isDark ? "#94A3B8" : "#64748B", fontSize: 12}}>{item.cantidad} x ${item.precio}</Text>
              </View>
              <Text style={[dynamicStyles.text, {fontWeight: 'bold', marginRight: 15}]}>${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</Text>
              <TouchableOpacity onPress={() => eliminarItem(item.id)} style={styles.deleteIcon}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />

        <View style={styles.footer}>
          <Text style={[styles.totalText, dynamicStyles.text]}>Total: ${calcularTotal().toFixed(2)}</Text>
          <TouchableOpacity style={styles.pdfButton} onPress={generarYGuardarPDF}>
            <Ionicons name={cotizacionId ? "save-outline" : "share-outline"} size={24} color="#FFF" />
            <Text style={styles.pdfButtonText}>{cotizacionId ? "Actualizar y Generar PDF" : "Generar y Guardar PDF"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isPro && (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <View style={styles.lockContainer}>
            <Ionicons name="lock-closed" size={80} color="#0EA5E9" />
            <Text style={[styles.lockTitle, { color: isDark ? "#FFF" : "#0F172A" }]}>SolarCalc PRO</Text>
            <Text style={[styles.lockText, { color: isDark ? "#E2E8F0" : "#475569" }]}>Desbloquea la creación de cotizaciones editables, generación de PDFs profesionales y gestión de clientes.</Text>
            <TouchableOpacity style={styles.buyButton} onPress={() => setIsPro(true)}>
              <Text style={styles.buyButtonText}>Desbloquear PRO (Test)</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold" },
  cancelButton: { backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  cancelText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  label: { fontSize: 14, marginBottom: 12, fontWeight: "600" },
  addButton: { backgroundColor: "#10B981", flexDirection: "row", padding: 12, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 12 },
  addButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  deleteIcon: { padding: 5 },
  footer: { marginTop: 10, borderTopWidth: 1, borderColor: "#CBD5E1", paddingTop: 16 },
  totalText: { fontSize: 22, fontWeight: "bold", textAlign: "right", marginBottom: 16, color: "#0EA5E9" },
  pdfButton: { backgroundColor: "#0EA5E9", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pdfButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  lockContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: "rgba(0,0,0,0.1)" },
  lockTitle: { fontSize: 28, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  lockText: { fontSize: 16, textAlign: "center", lineHeight: 24, marginBottom: 30 },
  buyButton: { backgroundColor: "#0EA5E9", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30 },
  buyButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" }
});