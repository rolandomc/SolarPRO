import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

export default function Index() {
  // Estados para los inputs del usuario
  const [consumoMensual, setConsumoMensual] = useState("");
  const [horasSolPico, setHorasSolPico] = useState("");
  const [potenciaPanel, setPotenciaPanel] = useState("");
  
  // Estado para almacenar los resultados del cálculo
  const [resultados, setResultados] = useState<{
    paneles: number;
    potenciaSistema: number;
    inversorRecomendado: number;
  } | null>(null);

  const calcularSistema = () => {
    const consumo = parseFloat(consumoMensual);
    const hsp = parseFloat(horasSolPico);
    const panelW = parseFloat(potenciaPanel);

    // Validación básica
    if (isNaN(consumo) || isNaN(hsp) || isNaN(panelW) || hsp <= 0 || panelW <= 0) {
      return; // Más adelante agregaremos alertas visuales aquí
    }

    // 1. Consumo diario estimado (kWh)
    const consumoDiario = consumo / 30;
    
    // 2. Energía a generar por día considerando ~20% de pérdidas (factor 1.2)
    const energiaRequerida = consumoDiario * 1.2;
    
    // 3. Potencia del arreglo fotovoltaico requerida en kW y W
    const potenciaArregloKW = energiaRequerida / hsp;
    const potenciaArregloW = potenciaArregloKW * 1000;
    
    // 4. Número de paneles (redondeado hacia arriba)
    const numeroPaneles = Math.ceil(potenciaArregloW / panelW);
    
    // 5. Potencia total real instalada (kW)
    const potenciaTotalInstalada = (numeroPaneles * panelW) / 1000;
    
    // 6. Dimensionamiento del inversor (Típicamente dimensionado al ~90%-100% del arreglo para optimizar eficiencia)
    const inversorRecomendado = potenciaTotalInstalada * 0.9;

    setResultados({
      paneles: numeroPaneles,
      potenciaSistema: potenciaTotalInstalada,
      inversorRecomendado: inversorRecomendado,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dimensionamiento Rápido</Text>
      <Text style={styles.subtitle}>
        Ingresa los datos para calcular los requerimientos técnicos. Las funciones de guardado de proyectos y exportación PDF están reservadas para la versión Pro.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Consumo Mensual Promedio (kWh):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={consumoMensual}
          onChangeText={setConsumoMensual}
          placeholder="Ej. 500"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Horas de Sol Pico (HSP):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={horasSolPico}
          onChangeText={setHorasSolPico}
          placeholder="Ej. 5.5"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Potencia del Panel (Watts):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={potenciaPanel}
          onChangeText={setPotenciaPanel}
          placeholder="Ej. 550"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={calcularSistema}>
        <Text style={styles.buttonText}>Calcular Sistema</Text>
      </TouchableOpacity>

      {/* Tarjeta de Resultados */}
      {resultados && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Resultados Técnicos</Text>
          <Text style={styles.resultText}>
            • Número de Paneles: <Text style={styles.bold}>{resultados.paneles} pzas</Text>
          </Text>
          <Text style={styles.resultText}>
            • Potencia Instalada: <Text style={styles.bold}>{resultados.potenciaSistema.toFixed(2)} kW</Text>
          </Text>
          <Text style={styles.resultText}>
            • Capacidad Mínima de Inversor: <Text style={styles.bold}>{resultados.inversorRecomendado.toFixed(2)} kW</Text>
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#F8FAFC", // Gris muy claro y limpio
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#0EA5E9",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  resultsCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#0F172A",
  },
  resultText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#475569",
  },
  bold: {
    fontWeight: "bold",
    color: "#0F172A",
  }
});