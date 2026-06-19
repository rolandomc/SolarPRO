// app/quotes.tsx
import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generarCotizacionProfesional, ItemCotizacion, RoiData, IngData } from '../utils/pdfGenerator';

export default function Quotes() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams();

  const [isPro, setIsPro]               = useState(false);
  const [cotizacionId, setCotizacionId] = useState<string | null>(null);
  const [cliente, setCliente]           = useState('');
  const [items, setItems]               = useState<ItemCotizacion[]>([]);
  const [desc, setDesc]                 = useState('');
  const [cant, setCant]                 = useState('');
  const [prec, setPrec]                 = useState('');
  const [roiData, setRoiData]           = useState<RoiData | null>(null);
  const [ingData, setIngData]           = useState<IngData | null>(null);

  useEffect(() => {
    if (params.clienteParam) {
      setIsPro(true);
      setCliente(String(params.clienteParam));
      if (params.itemsParam) {
        try { setItems(JSON.parse(String(params.itemsParam))); } catch (_) {}
      }
      if (params.roiParam) {
        try { setRoiData(JSON.parse(String(params.roiParam))); } catch (_) {}
      }
      if (params.ingParam) {
        try { setIngData(JSON.parse(String(params.ingParam))); } catch (_) {}
      }
      setCotizacionId(null);
      return;
    }
    if (params.editId) {
      setIsPro(true);
      const cargar = async () => {
        try {
          const data = await AsyncStorage.getItem('historialCotizaciones');
          if (data) {
            const historial = JSON.parse(data);
            const cot = historial.find((c: any) => c.id === params.editId);
            if (cot) {
              setCotizacionId(cot.id);
              setCliente(cot.cliente);
              setItems(cot.items || []);
              setRoiData(cot.roi || null);
              setIngData(cot.ing || null);
            }
          }
        } catch {}
      };
      cargar();
    } else {
      setCotizacionId(null); setCliente(''); setItems([]); setRoiData(null); setIngData(null);
    }
  }, [params.editId, params.clienteParam]);

  const limpiarFormulario = () => {
    setCotizacionId(null); setCliente(''); setItems([]);
    setDesc(''); setCant(''); setPrec(''); setRoiData(null); setIngData(null);
    router.setParams({ editId: '', clienteParam: '', itemsParam: '', roiParam: '', ingParam: '' });
  };

  const agregarItem = () => {
    if (desc && cant && prec) {
      setItems([...items, { id: Math.random().toString(), descripcion: desc, cantidad: cant, precio: prec }]);
      setDesc(''); setCant(''); setPrec('');
    } else Alert.alert('Atención', 'Llena todos los campos.');
  };

  const eliminarItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const calcularTotal = () => items.reduce((t, i) => t + parseFloat(i.cantidad) * parseFloat(i.precio), 0);

  const procesarCotizacion = async () => {
    if (!cliente || items.length === 0) return Alert.alert('Faltan datos', 'Agrega cliente y componentes.');
    try {
      const perfilGuardado = await AsyncStorage.getItem('perfilEmpresa');
      const perfil = perfilGuardado ? JSON.parse(perfilGuardado) : null;
      const total  = calcularTotal();

      await generarCotizacionProfesional(cliente, items, total, perfil, roiData, ingData);

      const historialGuardado = await AsyncStorage.getItem('historialCotizaciones');
      let historial = historialGuardado ? JSON.parse(historialGuardado) : [];
      const nuevaCotizacion = {
        id:      cotizacionId || Date.now().toString(),
        cliente, items, total,
        fecha:   new Date().toLocaleDateString(),
        roi:     roiData,
        ing:     ingData,
      };
      if (cotizacionId) {
        historial = historial.map((c: any) => c.id === cotizacionId ? nuevaCotizacion : c);
        Alert.alert('Éxito', 'Cotización actualizada.');
      } else {
        historial.push(nuevaCotizacion);
      }
      await AsyncStorage.setItem('historialCotizaciones', JSON.stringify(historial));
      limpiarFormulario();
    } catch { Alert.alert('Error', 'No se pudo generar la cotización.'); }
  };

  const ds = {
    bg:    { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    text:  { color: isDark ? '#F1F5F9' : '#0F172A' },
    sub:   { color: isDark ? '#94A3B8' : '#64748B' },
    input: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: isDark ? '#F8FAFC' : '#0F172A' },
    card:  { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
  };

  const total = calcularTotal();

  return (
    <SafeAreaView style={[{ flex:1 }, ds.bg]} edges={['top','left','right']}>
      <ScrollView style={[{ flex:1 }, ds.bg]} contentContainerStyle={{ padding:20, paddingBottom:60 }}>
        <View style={qs.headerRow}>
          <Text style={[qs.title, ds.text]}>{cotizacionId ? 'Editar Cotización' : 'Nueva Cotización'}</Text>
          {(cotizacionId || cliente) && (
            <TouchableOpacity onPress={limpiarFormulario} style={qs.cancelBtn}>
              <Text style={{ color:'#FFF', fontWeight:'bold' }}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={[qs.input, ds.input, { marginBottom:16 }]}
          placeholder="Nombre del Cliente"
          placeholderTextColor={isDark?'#64748B':'#94A3B8'}
          value={cliente} onChangeText={setCliente}
        />

        <View style={[qs.addCard, ds.card]}>
          <TextInput style={[qs.input, ds.input, { marginBottom:10 }]}
            placeholder="Descripción" placeholderTextColor={isDark?'#64748B':'#94A3B8'}
            value={desc} onChangeText={setDesc} />
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <TextInput style={[qs.input, ds.input, { width:'48%' }]}
              placeholder="Cant." keyboardType="numeric"
              placeholderTextColor={isDark?'#64748B':'#94A3B8'}
              value={cant} onChangeText={setCant} />
            <TextInput style={[qs.input, ds.input, { width:'48%' }]}
              placeholder="Precio" keyboardType="numeric"
              placeholderTextColor={isDark?'#64748B':'#94A3B8'}
              value={prec} onChangeText={setPrec} />
          </View>
          <TouchableOpacity style={qs.addBtn} onPress={agregarItem}>
            <Text style={{ color:'#FFF', fontWeight:'bold' }}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {items.map(item => (
          <View key={item.id} style={[qs.itemRow, ds.card]}>
            <View style={{ flex:1 }}>
              <Text style={[ds.text, { fontWeight:'bold' }]}>{item.descripcion}</Text>
              <Text style={[ds.sub, { fontSize:12 }]}>{item.cantidad} × ${parseFloat(item.precio).toLocaleString()}</Text>
            </View>
            <Text style={[ds.text, { fontWeight:'bold', marginRight:15 }]}>
              ${(parseFloat(item.cantidad) * parseFloat(item.precio)).toLocaleString()}
            </Text>
            <TouchableOpacity onPress={() => eliminarItem(item.id)}>
              <Ionicons name="trash" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={[qs.totalBox, { borderColor: isDark?'#334155':'#CBD5E1' }]}>
          <Text style={[ds.sub, { fontSize:14 }]}>Total del sistema</Text>
          <Text style={{ fontSize:24, fontWeight:'bold', color:'#10B981' }}>${total.toLocaleString()}</Text>
        </View>

        {roiData && (
          <View style={[qs.roiCard, { borderColor:'#10B981', backgroundColor: isDark?'rgba(16,185,129,0.06)':'rgba(16,185,129,0.04)' }]}>
            <View style={qs.roiHeader}>
              <Ionicons name="trending-up" size={22} color="#10B981" />
              <Text style={[ds.text, { fontWeight:'bold', fontSize:16, marginLeft:8 }]}>Análisis de Retorno de Inversión</Text>
            </View>
            <Text style={[ds.sub, { fontSize:12, marginBottom:12 }]}>
              Tarifa CFE: {roiData.tarifa}  •  ${roiData.precioKwh}/kWh  •  Sistema genera ~{roiData.kwGeneradosMes} kWh/mes
            </Text>
          </View>
        )}

        {ingData && (
          <View style={[qs.roiCard, { borderColor:'#0EA5E9', backgroundColor: isDark?'rgba(14,165,233,0.06)':'rgba(14,165,233,0.04)' }]}>
            <View style={qs.roiHeader}>
              <Ionicons name="git-network-outline" size={22} color="#0EA5E9" />
              <Text style={[ds.text, { fontWeight:'bold', fontSize:16, marginLeft:8 }]}>Diagrama unifilar incluido en PDF</Text>
            </View>
            <Text style={[ds.sub, { fontSize:12 }]}>Paneles: {ingData.numPaneles} • Sistema: {ingData.potenciaKW.toFixed(2)} kWp • Inversor: {ingData.inversor?.marca} {ingData.inversor?.modelo}</Text>
          </View>
        )}

        <TouchableOpacity style={qs.pdfBtn} onPress={procesarCotizacion}>
          <Ionicons name="save-outline" size={24} color="#FFF" />
          <Text style={{ color:'#FFF', fontWeight:'bold', marginLeft:8, fontSize:16 }}>
            {cotizacionId ? 'Actualizar Cotización' : 'Generar PDF'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {!isPro && (
        <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <View style={{ flex:1, justifyContent:'center', alignItems:'center', padding:30 }}>
            <Ionicons name="lock-closed" size={80} color="#0EA5E9" />
            <Text style={{ fontSize:24, fontWeight:'bold', color: isDark?'#FFF':'#0F172A', marginVertical:10 }}>PRO</Text>
            <TouchableOpacity style={{ backgroundColor:'#0EA5E9', padding:15, borderRadius:30 }} onPress={() => setIsPro(true)}>
              <Text style={{ color:'#FFF', fontWeight:'bold' }}>Desbloquear</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </SafeAreaView>
  );
}

const qs = StyleSheet.create({
  headerRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  title:        { fontSize:20, fontWeight:'bold' },
  cancelBtn:    { backgroundColor:'#EF4444', padding:8, borderRadius:6 },
  input:        { borderWidth:1, borderRadius:8, padding:12, fontSize:16 },
  addCard:      { padding:16, borderRadius:12, borderWidth:1, marginBottom:12 },
  addBtn:       { backgroundColor:'#10B981', padding:12, borderRadius:8, alignItems:'center', marginTop:12 },
  itemRow:      { flexDirection:'row', alignItems:'center', padding:12, borderWidth:1, borderRadius:8, marginBottom:8 },
  totalBox:     { borderTopWidth:1, paddingTop:14, marginTop:4, marginBottom:20, alignItems:'flex-end' },
  pdfBtn:       { backgroundColor:'#0EA5E9', flexDirection:'row', padding:16, borderRadius:8, alignItems:'center', justifyContent:'center', marginTop:20 },
  roiCard:      { borderWidth:1.5, borderRadius:14, padding:16, marginBottom:20 },
  roiHeader:    { flexDirection:'row', alignItems:'center', marginBottom:6 },
});
