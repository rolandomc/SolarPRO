import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "./_layout";

export default function Quotes() {
  const { isDark } = useContext(ThemeContext);
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<{ id: string; descripcion: string; cantidad: string; precio: string }[]>([]);

  // Estados temporales para agregar un nuevo item
  const [desc, setDesc] = useState("");
  const [cant, setCant] = useState("");
  const [prec, setPrec] = useState("");

  const agregarItem = () => {
    if (desc && cant && prec) {
      setItems([...items, { id: Math.random().toString(), descripcion: desc, cantidad: cant, precio: prec }]);
      setDesc(""); setCant(""); setPrec("");
    }
  };

  const calcularTotal = () => {
    return items.reduce((total, item) => total + (parseFloat(item.cantidad) * parseFloat(item.precio)), 0);
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    text: { color: isDark ? "#F1F5F9" : "#0F172A" },
    input: { 
      backgroundColor: isDark ? "#1E293B" : "#FFFFFF", 
      borderColor: isDark ? "#334155" : "#CBD5E1",
      color: isDark ? "#F8FAFC" : "#0F172A" 
    },
    card: { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.text]}>Datos de Cotización</Text>
      
      <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 16}]} placeholder="Nombre del Cliente" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cliente} onChangeText={setCliente} />

      <View style={[styles.card, dynamicStyles.card, {padding: 16, marginBottom: 16, borderRadius: 8, borderWidth: 1}]}>
        <Text style={[styles.label, dynamicStyles.text]}>Agregar Componente (Panel, Inversor, Cable, etc.)</Text>
        <TextInput style={[styles.input, dynamicStyles.input, {marginBottom: 8}]} placeholder="Descripción" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={desc} onChangeText={setDesc} />
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} placeholder="Cantidad" keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={cant} onChangeText={setCant} />
          <TextInput style={[styles.input, dynamicStyles.input, {width: '48%'}]} placeholder="Precio Unit." keyboardType="numeric" placeholderTextColor={isDark ? "#64748B" : "#94A3B8"} value={prec} onChangeText={setPrec} />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={agregarItem}>
          <Text style={styles.addButtonText}>Agregar a Cotización</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.itemRow, dynamicStyles.card]}>
            <Text style={[dynamicStyles.text, {flex: 2}]}>{item.cantidad}x {item.descripcion}</Text>
            <Text style={[dynamicStyles.text, {fontWeight: 'bold'}]}>${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={[styles.totalText, dynamicStyles.text]}>Total: ${calcularTotal().toFixed(2)}</Text>
        <TouchableOpacity style={styles.pdfButton}>
          <Ionicons name="share-outline" size={24} color="#FFF" />
          <Text style={styles.pdfButtonText}>Generar y Compartir PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: "600" },
  addButton: { backgroundColor: "#10B981", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  addButtonText: { color: "#FFFFFF", fontWeight: "bold" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  footer: { marginTop: 20, borderTopWidth: 1, borderColor: "#CBD5E1", paddingTop: 16 },
  totalText: { fontSize: 22, fontWeight: "bold", textAlign: "right", marginBottom: 16 },
  pdfButton: { backgroundColor: "#EF4444", flexDirection: "row", padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pdfButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", marginLeft: 10 }
});