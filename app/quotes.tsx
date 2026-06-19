// app/quotes.tsx
import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generarCotizacionProfesional, ItemCotizacion, RoiData } from '../utils/pdfGenerator';
import LoadingOverlay from '../components/LoadingOverlay';

interface Plantilla {
  id: string; nombre: string; descripcion: string;
  icono: string; color: string; potencia: string;
  items: Omit<ItemCotizacion, 'id'>[];
}

const PLANTILLAS: Plantilla[] = [
  {
    id: 't1', nombre: 'Residencial 3 kWp', descripcion: 'Sistema pequeño para casa sin clima',
    icono: 'home-outline', color: '#10B981', potencia: '3.0 kWp',
    items: [
      { descripcion: 'Panel Canadian Solar HiKu6 500W', cantidad: '6',  precio: '2950'  },
      { descripcion: 'Inversor Growatt MIN 3000TL-X2',  cantidad: '1',  precio: '10800' },
      { descripcion: 'Estructura aluminio anodizado',   cantidad: '6',  precio: '380'   },
      { descripcion: 'Cable solar 6mm² (m)',            cantidad: '40', precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',         cantidad: '1',  precio: '1800'  },
      { descripcion: 'Mano de obra e instalación',      cantidad: '1',  precio: '6000'  },
    ],
  },
  {
    id: 't2', nombre: 'Residencial 5.5 kWp', descripcion: 'Sistema medio con 1 clima, TV y refrigerador',
    icono: 'home', color: '#0EA5E9', potencia: '5.5 kWp',
    items: [
      { descripcion: 'Panel Canadian Solar HiKu6 550W', cantidad: '10', precio: '3200'  },
      { descripcion: 'Inversor Growatt MIN 5000TL-X2',  cantidad: '1',  precio: '15200' },
      { descripcion: 'Estructura aluminio anodizado',   cantidad: '10', precio: '380'   },
      { descripcion: 'Cable solar 6mm² (m)',            cantidad: '60', precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',         cantidad: '1',  precio: '2200'  },
      { descripcion: 'Mano de obra e instalación',      cantidad: '1',  precio: '8500'  },
    ],
  },
  {
    id: 't3', nombre: 'Residencial Premium 8 kWp', descripcion: 'Casa grande con 2+ climas, calentador eléctrico',
    icono: 'business-outline', color: '#8B5CF6', potencia: '8.0 kWp',
    items: [
      { descripcion: 'Panel JA Solar JAM72D40 580W',    cantidad: '14', precio: '3350'  },
      { descripcion: 'Inversor Fronius Primo 8.2-1',    cantidad: '1',  precio: '30000' },
      { descripcion: 'Estructura aluminio anodizado',   cantidad: '14', precio: '420'   },
      { descripcion: 'Cable solar 6mm² (m)',            cantidad: '80', precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',         cantidad: '1',  precio: '2800'  },
      { descripcion: 'Mano de obra e instalación',      cantidad: '1',  precio: '12000' },
    ],
  },
  {
    id: 't4', nombre: 'Negocio / Comercial 10 kWp', descripcion: 'Local comercial, oficinas, pequeña empresa',
    icono: 'storefront-outline', color: '#F59E0B', potencia: '10.0 kWp',
    items: [
      { descripcion: 'Panel LONGi Hi-MO 6 580W',        cantidad: '18', precio: '3500'  },
      { descripcion: 'Inversor Growatt MOD 10KTL3-X',   cantidad: '1',  precio: '26500' },
      { descripcion: 'Estructura aluminio anodizado',   cantidad: '18', precio: '420'   },
      { descripcion: 'Cable solar 6mm² (m)',            cantidad: '100',precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',         cantidad: '1',  precio: '3200'  },
      { descripcion: 'Mano de obra e instalación',      cantidad: '1',  precio: '15000' },
    ],
  },
  {
    id: 't5', nombre: 'Industrial 30 kWp', descripcion: 'Empresa mediana, nave industrial, bodega',
    icono: 'business', color: '#EF4444', potencia: '30.0 kWp',
    items: [
      { descripcion: 'Panel Jinko Tiger Neo N-type 580W',cantidad: '52', precio: '3400'  },
      { descripcion: 'Inversor Growatt MOD 30KTL3-X',   cantidad: '1',  precio: '61000' },
      { descripcion: 'Estructura aluminio anodizado',   cantidad: '52', precio: '450'   },
      { descripcion: 'Cable solar 6mm² (m)',            cantidad: '250',precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',         cantidad: '2',  precio: '3800'  },
      { descripcion: 'Monitoreo WiFi + datalogger',     cantidad: '1',  precio: '4500'  },
      { descripcion: 'Mano de obra e instalación',      cantidad: '1',  precio: '35000' },
    ],
  },
  {
    id: 't6', nombre: 'Híbrido con Batería 5 kWp', descripcion: 'Sistema con respaldo de energía para cortes de luz',
    icono: 'battery-charging-outline', color: '#06B6D4', potencia: '5.0 kWp',
    items: [
      { descripcion: 'Panel Canadian Solar HiKu6 550W',  cantidad: '10', precio: '3200'  },
      { descripcion: 'Inversor Growatt SPH 5000TL BL-UP',cantidad: '1',  precio: '28000' },
      { descripcion: 'Batería Growatt GBLI6531 (5.1kWh)',cantidad: '1',  precio: '35000' },
      { descripcion: 'Estructura aluminio anodizado',    cantidad: '10', precio: '380'   },
      { descripcion: 'Cable solar 6mm² (m)',             cantidad: '60', precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',          cantidad: '1',  precio: '2500'  },
      { descripcion: 'Mano de obra e instalación',       cantidad: '1',  precio: '10000' },
    ],
  },
  {
    id: 't7', nombre: 'SolarEdge Premium 6 kWp', descripcion: 'Con optimizadores por panel, ideal para techos con sombra',
    icono: 'flash', color: '#F97316', potencia: '6.0 kWp',
    items: [
      { descripcion: 'Panel JA Solar JAM66D45 615W N-type', cantidad: '10', precio: '3700'  },
      { descripcion: 'Inversor SolarEdge SE6000H HD-Wave',  cantidad: '1',  precio: '27500' },
      { descripcion: 'Optimizador SolarEdge P404',          cantidad: '10', precio: '1800'  },
      { descripcion: 'Estructura aluminio anodizado',       cantidad: '10', precio: '420'   },
      { descripcion: 'Cable solar 6mm² (m)',               cantidad: '60', precio: '28'    },
      { descripcion: 'Caja protecciones DC/AC',             cantidad: '1',  precio: '2800'  },
      { descripcion: 'Mano de obra e instalación',          cantidad: '1',  precio: '10000' },
    ],
  },
];

export default function Quotes() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams();

  const [isPro, setIsPro]                   = useState(false);
  const [cotizacionId, setCotizacionId]     = useState<string | null>(null);
  const [cliente, setCliente]               = useState('');
  const [items, setItems]                   = useState<ItemCotizacion[]>([]);
  const [desc, setDesc]                     = useState('');
  const [cant, setCant]                     = useState('');
  const [prec, setPrec]                     = useState('');
  const [roiData, setRoiData]               = useState<RoiData | null>(null);
  const [modalPlantillas, setModalPlantillas] = useState(false);
  const [loading, setLoading]               = useState(false);
  const [loadingMsg, setLoadingMsg]         = useState('');

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
              setCotizacionId(cot.id); setCliente(cot.cliente);
              setItems(cot.items || []); setRoiData(cot.roi || null);
            }
          }
        } catch {}
      };
      cargar();
    } else {
      setCotizacionId(null); setCliente(''); setItems([]); setRoiData(null);
    }
  }, [params.editId, params.clienteParam]);

  const limpiarFormulario = () => {
    setCotizacionId(null); setCliente(''); setItems([]);
    setDesc(''); setCant(''); setPrec(''); setRoiData(null);
    router.setParams({ editId: '', clienteParam: '', itemsParam: '', roiParam: '' });
  };

  const agregarItem = () => {
    if (desc && cant && prec) {
      setItems([...items, { id: Math.random().toString(), descripcion: desc, cantidad: cant, precio: prec }]);
      setDesc(''); setCant(''); setPrec('');
    } else Alert.alert('Atención', 'Llena todos los campos.');
  };

  const eliminarItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const calcularTotal = () => items.reduce((t, i) => t + parseFloat(i.cantidad) * parseFloat(i.precio), 0);

  const aplicarPlantilla = (p: Plantilla) => {
    const aplicar = () => {
      setItems(p.items.map(it => ({ ...it, id: Math.random().toString() })));
      setModalPlantillas(false);
    };
    if (items.length > 0) {
      Alert.alert(
        'Reemplazar componentes',
        `Se reemplazarán los ${items.length} componentes actuales con la plantilla «${p.nombre}». ¿Continuar?`,
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Reemplazar', style: 'destructive', onPress: aplicar }]
      );
    } else { aplicar(); }
  };

  const procesarCotizacion = async () => {
    if (!cliente || items.length === 0) return Alert.alert('Faltan datos', 'Agrega cliente y componentes.');
    setLoadingMsg('Generando cotización PDF...');
    setLoading(true);
    try {
      const perfilGuardado = await AsyncStorage.getItem('perfilEmpresa');
      const perfil = perfilGuardado ? JSON.parse(perfilGuardado) : null;
      const total  = calcularTotal();
      await generarCotizacionProfesional(cliente, items, total, perfil, roiData);
      const historialGuardado = await AsyncStorage.getItem('historialCotizaciones');
      let historial = historialGuardado ? JSON.parse(historialGuardado) : [];
      const nuevaCotizacion = {
        id:      cotizacionId || Date.now().toString(),
        cliente, items, total,
        fecha:   new Date().toLocaleDateString(),
        roi:     roiData,
      };
      if (cotizacionId) {
        historial = historial.map((c: any) => c.id === cotizacionId ? nuevaCotizacion : c);
        Alert.alert('✅ Éxito', 'Cotización actualizada y PDF generado.');
      } else {
        historial.push(nuevaCotizacion);
        Alert.alert('✅ Éxito', 'Cotización guardada y PDF generado.');
      }
      await AsyncStorage.setItem('historialCotizaciones', JSON.stringify(historial));
      limpiarFormulario();
    } catch { Alert.alert('Error', 'No se pudo generar la cotización.'); }
    finally { setLoading(false); }
  };

  const ds = {
    bg:    { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    text:  { color: isDark ? '#F1F5F9' : '#0F172A' },
    sub:   { color: isDark ? '#94A3B8' : '#64748B' },
    input: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: isDark ? '#F8FAFC' : '#0F172A' },
    card:  { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
    modalBg: { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    plantillaCard: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
  };

  const total = calcularTotal();

  const renderPlantilla = ({ item: p }: { item: Plantilla }) => {
    const subtotal = p.items.reduce((s, i) => s + parseFloat(i.cantidad) * parseFloat(i.precio), 0);
    return (
      <TouchableOpacity
        style={[qs.plantillaCard, ds.plantillaCard, { borderLeftColor: p.color, borderLeftWidth: 4 }]}
        onPress={() => aplicarPlantilla(p)} activeOpacity={0.75}>
        <View style={[qs.plantillaIcono, { backgroundColor: p.color + '20' }]}>
          <Ionicons name={p.icono as any} size={26} color={p.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[ds.text, { fontWeight: 'bold', fontSize: 15 }]}>{p.nombre}</Text>
          <Text style={[ds.sub, { fontSize: 12, marginTop: 2 }]}>{p.descripcion}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }}>
            <View style={[qs.chip, { backgroundColor: p.color + '18' }]}>
              <Ionicons name="flash" size={11} color={p.color} />
              <Text style={{ fontSize: 11, color: p.color, fontWeight: 'bold', marginLeft: 3 }}>{p.potencia}</Text>
            </View>
            <View style={[qs.chip, { backgroundColor: p.color + '18' }]}>
              <Ionicons name="layers-outline" size={11} color={p.color} />
              <Text style={{ fontSize: 11, color: p.color, fontWeight: 'bold', marginLeft: 3 }}>{p.items.length} componentes</Text>
            </View>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, color: p.color, fontWeight: 'bold' }}>~${Math.round(subtotal / 1000)}k</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[{ flex:1 }, ds.bg]} edges={['top','left','right']}>
      <ScrollView style={[{ flex:1 }, ds.bg]} contentContainerStyle={{ padding:20, paddingBottom:60 }}>

        <View style={qs.headerRow}>
          <Text style={[qs.title, ds.text]}>{cotizacionId ? 'Editar Cotización' : 'Nueva Cotización'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={qs.plantillaBtn} onPress={() => setModalPlantillas(true)}>
              <Ionicons name="copy-outline" size={16} color="#FFF" />
              <Text style={{ color:'#FFF', fontWeight:'bold', fontSize: 13, marginLeft: 4 }}>Plantilla</Text>
            </TouchableOpacity>
            {(cotizacionId || cliente) && (
              <TouchableOpacity onPress={limpiarFormulario} style={qs.cancelBtn}>
                <Text style={{ color:'#FFF', fontWeight:'bold' }}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
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
            <View style={qs.roiChips}>
              <RoiChip icon="calendar"    color="#10B981" titulo="Ahorro bimestral" valor={`$${roiData.ahorroBimestral.toLocaleString()}`} sub="MXN c/2 meses" />
              <RoiChip icon="cash"        color="#0EA5E9" titulo="Ahorro mensual"   valor={`$${roiData.ahorroMensual.toLocaleString()}`}   sub="MXN/mes" />
              <RoiChip icon="stats-chart" color="#F59E0B" titulo="Ahorro anual"     valor={`$${roiData.ahorroAnual.toLocaleString()}`}     sub="MXN/año" />
            </View>
            <View style={[qs.roiHighlight, { borderColor:'#0EA5E9', backgroundColor: isDark?'rgba(14,165,233,0.08)':'rgba(14,165,233,0.06)' }]}>
              <Ionicons name="time-outline" size={32} color="#0EA5E9" />
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={[ds.sub, { fontSize:12 }]}>Recuperas tu inversión en</Text>
                <Text style={{ fontSize:26, fontWeight:'bold', color:'#0EA5E9' }}>{roiData.roiMeses} meses</Text>
                <Text style={[ds.sub, { fontSize:12 }]}>({roiData.roiAnos} años)</Text>
              </View>
            </View>
            <View style={[qs.proyeccionBox, { borderColor: isDark?'#334155':'#E2E8F0' }]}>
              <Text style={[ds.sub, { fontSize:12, marginBottom:6, fontWeight:'bold' }]}>Proyección a 25 años</Text>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={[ds.sub, { fontSize:13 }]}>Ahorro total generado</Text>
                <Text style={[ds.text, { fontWeight:'bold', fontSize:14 }]}>${roiData.ahorroTotal25.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={[ds.sub, { fontSize:13 }]}>Inversión inicial</Text>
                <Text style={[{ color:'#EF4444', fontWeight:'bold', fontSize:14 }]}>- ${total.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection:'row', justifyContent:'space-between', borderTopWidth:1, borderColor: isDark?'#334155':'#CBD5E1', paddingTop:6, marginTop:4 }}>
                <Text style={[ds.text, { fontWeight:'bold', fontSize:14 }]}>Ganancia neta</Text>
                <Text style={{ fontWeight:'bold', fontSize:18, color: roiData.gananciaTotal25 >= 0 ? '#10B981' : '#EF4444' }}>
                  ${roiData.gananciaTotal25.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={[ds.sub, { fontSize:10, marginTop:10, fontStyle:'italic', textAlign:'center' }]}>
              * Estimado con tarifa CFE {roiData.tarifa} ${roiData.precioKwh}/kWh y factor PR=80%.
            </Text>
          </View>
        )}

        <TouchableOpacity style={[qs.pdfBtn, loading && { opacity: 0.7 }]} onPress={procesarCotizacion} disabled={loading}>
          <Ionicons name="save-outline" size={24} color="#FFF" />
          <Text style={{ color:'#FFF', fontWeight:'bold', marginLeft:8, fontSize:16 }}>
            {cotizacionId ? 'Actualizar Cotización' : 'Generar PDF'}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal de Plantillas */}
      <Modal visible={modalPlantillas} animationType="slide" transparent onRequestClose={() => setModalPlantillas(false)}>
        <View style={qs.modalOverlay}>
          <View style={[qs.modalBox, ds.modalBg]}>
            <View style={qs.modalHeader}>
              <View>
                <Text style={[ds.text, { fontSize: 18, fontWeight: 'bold' }]}>Plantillas de sistemas</Text>
                <Text style={[ds.sub, { fontSize: 13, marginTop: 2 }]}>Selecciona una para pre-llenar los componentes</Text>
              </View>
              <TouchableOpacity onPress={() => setModalPlantillas(false)}>
                <Ionicons name="close-circle" size={30} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PLANTILLAS} keyExtractor={p => p.id} renderItem={renderPlantilla}
              showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          </View>
        </View>
      </Modal>

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

      {/* ✅ Loading overlay PDF */}
      <LoadingOverlay
        visible={loading}
        mensaje={loadingMsg}
        icono="document-text"
        submensaje="Preparando tu cotización profesional..."
      />
    </SafeAreaView>
  );
}

const RoiChip = ({ icon, color, titulo, valor, sub }: any) => (
  <View style={[qs.roiChip, { backgroundColor: color + '15' }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={{ fontSize:10, color:'#64748B', marginTop:4 }}>{titulo}</Text>
    <Text style={{ fontSize:16, fontWeight:'bold', color }}>{valor}</Text>
    <Text style={{ fontSize:10, color:'#94A3B8' }}>{sub}</Text>
  </View>
);

const qs = StyleSheet.create({
  headerRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  title:          { fontSize:20, fontWeight:'bold' },
  plantillaBtn:   { flexDirection:'row', alignItems:'center', backgroundColor:'#8B5CF6', paddingHorizontal:12, paddingVertical:8, borderRadius:8 },
  cancelBtn:      { backgroundColor:'#EF4444', padding:8, borderRadius:6 },
  input:          { borderWidth:1, borderRadius:8, padding:12, fontSize:16 },
  addCard:        { padding:16, borderRadius:12, borderWidth:1, marginBottom:12 },
  addBtn:         { backgroundColor:'#10B981', padding:12, borderRadius:8, alignItems:'center', marginTop:12 },
  itemRow:        { flexDirection:'row', alignItems:'center', padding:12, borderWidth:1, borderRadius:8, marginBottom:8 },
  totalBox:       { borderTopWidth:1, paddingTop:14, marginTop:4, marginBottom:20, alignItems:'flex-end' },
  pdfBtn:         { backgroundColor:'#0EA5E9', flexDirection:'row', padding:16, borderRadius:8, alignItems:'center', justifyContent:'center', marginTop:20 },
  roiCard:        { borderWidth:1.5, borderRadius:14, padding:16, marginBottom:20 },
  roiHeader:      { flexDirection:'row', alignItems:'center', marginBottom:6 },
  roiChips:       { flexDirection:'row', justifyContent:'space-between', marginBottom:14 },
  roiChip:        { flex:1, alignItems:'center', borderRadius:10, padding:10, marginHorizontal:3 },
  roiHighlight:   { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderRadius:10, padding:14, marginBottom:14 },
  proyeccionBox:  { borderWidth:1, borderRadius:10, padding:12 },
  modalOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
  modalBox:       { borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'85%' },
  modalHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 },
  plantillaCard:  { flexDirection:'row', alignItems:'center', borderRadius:14, borderWidth:1, padding:14 },
  plantillaIcono: { width:48, height:48, borderRadius:12, justifyContent:'center', alignItems:'center' },
  chip:           { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:4, borderRadius:20 },
});
