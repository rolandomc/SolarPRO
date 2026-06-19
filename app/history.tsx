// app/history.tsx
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { generarCotizacionProfesional } from '../utils/pdfGenerator';

type Estado = 'cotizado' | 'aprobado' | 'instalado' | 'cancelado';

interface Cotizacion {
  id: string;
  cliente: string;
  items: any[];
  total: number;
  fecha: string;
  roi?: any;
  estado?: Estado;
  notas?: string;
}

const ESTADOS: { key: Estado; label: string; color: string; icon: string }[] = [
  { key: 'cotizado',  label: 'Cotizado',  color: '#0EA5E9', icon: 'document-text' },
  { key: 'aprobado',  label: 'Aprobado',  color: '#F59E0B', icon: 'checkmark-circle' },
  { key: 'instalado', label: 'Instalado', color: '#10B981', icon: 'sunny' },
  { key: 'cancelado', label: 'Cancelado', color: '#EF4444', icon: 'close-circle' },
];

const estadoInfo = (e?: Estado) => ESTADOS.find(s => s.key === e) || ESTADOS[0];

export default function History() {
  const { isDark } = useContext(ThemeContext);
  const router     = useRouter();

  const [lista, setLista]               = useState<Cotizacion[]>([]);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState<Estado | 'todos'>('todos');
  const [modalCot, setModalCot]         = useState<Cotizacion | null>(null);
  const [notaTemp, setNotaTemp]         = useState('');

  useFocusEffect(
    useCallback(() => { cargarHistorial(); }, [])
  );

  const cargarHistorial = async () => {
    try {
      const data = await AsyncStorage.getItem('historialCotizaciones');
      if (data) setLista(JSON.parse(data).reverse());
    } catch {}
  };

  const guardarHistorial = async (nuevo: Cotizacion[]) => {
    await AsyncStorage.setItem('historialCotizaciones', JSON.stringify([...nuevo].reverse()));
    setLista(nuevo);
  };

  const actualizarEstado = async (id: string, estado: Estado) => {
    const actualizado = lista.map(c => c.id === id ? { ...c, estado } : c);
    await guardarHistorial(actualizado);
  };

  const guardarNota = async () => {
    if (!modalCot) return;
    const actualizado = lista.map(c => c.id === modalCot.id ? { ...c, notas: notaTemp } : c);
    await guardarHistorial(actualizado);
    setModalCot({ ...modalCot, notas: notaTemp });
  };

  const eliminarCotizacion = (id: string) => {
    Alert.alert('Eliminar', '¿Seguro que quieres eliminar esta cotización?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const actualizado = lista.filter(c => c.id !== id);
          await guardarHistorial(actualizado);
          setModalCot(null);
        },
      },
    ]);
  };

  const regenaerPDF = async (cot: Cotizacion) => {
    try {
      const perfilGuardado = await AsyncStorage.getItem('perfilEmpresa');
      const perfil = perfilGuardado ? JSON.parse(perfilGuardado) : null;
      await generarCotizacionProfesional(cot.cliente, cot.items, cot.total, perfil, cot.roi);
    } catch { Alert.alert('Error', 'No se pudo generar el PDF.'); }
  };

  const editarEnCotizacion = (cot: Cotizacion) => {
    setModalCot(null);
    router.push({ pathname: '/quotes', params: { editId: cot.id } });
  };

  const listaFiltrada = lista.filter(c => {
    const coincideBusqueda = c.cliente.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado   = filtroEstado === 'todos' || (c.estado || 'cotizado') === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const totalInstalado = lista
    .filter(c => c.estado === 'instalado')
    .reduce((s, c) => s + c.total, 0);

  const totalVendido = lista
    .filter(c => c.estado === 'aprobado' || c.estado === 'instalado')
    .reduce((s, c) => s + c.total, 0);

  const kwInstalados = lista
    .filter(c => c.estado === 'instalado' && c.roi?.potenciaKWp)
    .reduce((s, c) => s + (c.roi.potenciaKWp as number), 0);

  const d = {
    bg:    { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    text:  { color: isDark ? '#F1F5F9' : '#0F172A' },
    sub:   { color: isDark ? '#94A3B8' : '#64748B' },
    input: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: isDark ? '#F8FAFC' : '#000' },
    card:  { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
    modal: { backgroundColor: isDark ? '#1E293B' : '#FFF' },
  };

  const renderItem = ({ item }: { item: Cotizacion }) => {
    const est = estadoInfo(item.estado);
    return (
      <TouchableOpacity
        style={[h.itemCard, d.card, { borderLeftColor: est.color, borderLeftWidth: 4 }]}
        onPress={() => { setModalCot(item); setNotaTemp(item.notas || ''); }}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[d.text, { fontWeight: 'bold', fontSize: 16 }]} numberOfLines={1}>{item.cliente}</Text>
          <Text style={[d.sub, { fontSize: 12, marginTop: 2 }]}>{item.fecha}</Text>
          {item.roi && (
            <Text style={[d.sub, { fontSize: 12 }]} numberOfLines={1}>
              {item.roi.potenciaKWp ? `${item.roi.potenciaKWp.toFixed(2)} kWp  •  ` : ''}
              ROI: {item.roi.roiMeses} meses
            </Text>
          )}
        </View>
        <View style={h.itemRight}>
          <Text style={h.itemTotal} numberOfLines={1}>${item.total.toLocaleString()}</Text>
          <View style={[h.estadoBadge, { backgroundColor: est.color + '22' }]}>
            <Ionicons name={est.icon as any} size={12} color={est.color} />
            <Text style={[h.estadoBadgeTxt, { color: est.color }]}>{est.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, d.bg]} edges={['top', 'left', 'right']}>

      <View style={[h.header, d.bg]}>
        <Text style={[h.title, d.text]}>Historial de Proyectos</Text>
        <Text style={[d.sub, { fontSize: 13 }]}>{lista.length} cotizaciones</Text>
      </View>

      <View style={h.statsRow}>
        <StatCard label="Instalado"  valor={`$${Math.round(totalInstalado/1000)}k`} color="#10B981" icon="sunny"           d={d} />
        <StatCard label="Aprobado"   valor={`$${Math.round(totalVendido/1000)}k`}   color="#F59E0B" icon="checkmark-circle" d={d} />
        <StatCard label="kWp inst."  valor={kwInstalados.toFixed(1)}                color="#0EA5E9" icon="flash"            d={d} />
      </View>

      <View style={[h.searchBox, d.input]}>
        <Ionicons name="search" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
        <TextInput
          style={[{ flex: 1, marginLeft: 8, fontSize: 15 }, d.input, { borderWidth: 0, padding: 0 }]}
          placeholder="Buscar cliente..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros — ScrollView horizontal sin restricción de altura */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={h.filtrosScroll}
        contentContainerStyle={h.filtrosContent}
      >
        <TouchableOpacity
          style={[h.filtroBadge, filtroEstado === 'todos' && { backgroundColor: '#334155', borderColor: '#334155' }]}
          onPress={() => setFiltroEstado('todos')}
        >
          <Text style={[
            h.filtroBadgeTxt,
            { color: filtroEstado === 'todos' ? '#FFF' : (isDark ? '#94A3B8' : '#64748B') },
          ]}>Todos</Text>
        </TouchableOpacity>

        {ESTADOS.map(e => (
          <TouchableOpacity
            key={e.key}
            style={[
              h.filtroBadge,
              { borderColor: e.color },
              filtroEstado === e.key && { backgroundColor: e.color },
            ]}
            onPress={() => setFiltroEstado(e.key)}
          >
            <Ionicons name={e.icon as any} size={14} color={filtroEstado === e.key ? '#FFF' : e.color} />
            <Text style={[
              h.filtroBadgeTxt,
              { marginLeft: 4, color: filtroEstado === e.key ? '#FFF' : e.color },
            ]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {listaFiltrada.length === 0 ? (
        <View style={h.empty}>
          <Ionicons name="folder-open-outline" size={64} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={[d.sub, { marginTop: 12, fontSize: 15, textAlign: 'center' }]}>
            {lista.length === 0
              ? 'Aún no hay cotizaciones.\nGenera una desde la pestaña Cotizar.'
              : 'Sin resultados para ese filtro.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listaFiltrada}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!modalCot} animationType="slide" transparent onRequestClose={() => setModalCot(null)}>
        <View style={h.modalOverlay}>
          <View style={[h.modalBox, d.modal]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={h.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[d.text, { fontWeight: 'bold', fontSize: 18 }]}>{modalCot?.cliente}</Text>
                  <Text style={[d.sub, { fontSize: 13 }]}>{modalCot?.fecha}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalCot(null)}>
                  <Ionicons name="close-circle" size={30} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={[h.totalBox, { borderColor: '#10B981' }]}>
                <Text style={[d.sub, { fontSize: 13 }]}>Total del sistema</Text>
                <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#10B981' }}>
                  ${modalCot?.total.toLocaleString()}
                </Text>
                {modalCot?.roi?.potenciaKWp && (
                  <Text style={[d.sub, { fontSize: 13, marginTop: 4 }]}>
                    {modalCot.roi.potenciaKWp.toFixed(2)} kWp instalados
                  </Text>
                )}
              </View>

              <Text style={[d.text, { fontWeight: 'bold', fontSize: 14, marginBottom: 8, marginTop: 4 }]}>Estado del proyecto</Text>
              <View style={h.estadosGrid}>
                {ESTADOS.map(e => {
                  const activo = (modalCot?.estado || 'cotizado') === e.key;
                  return (
                    <TouchableOpacity
                      key={e.key}
                      style={[h.estadoBtn, { borderColor: e.color, backgroundColor: activo ? e.color : 'transparent' }]}
                      onPress={() => {
                        actualizarEstado(modalCot!.id, e.key);
                        setModalCot({ ...modalCot!, estado: e.key });
                      }}
                    >
                      <Ionicons name={e.icon as any} size={18} color={activo ? '#FFF' : e.color} />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', marginLeft: 6, color: activo ? '#FFF' : e.color }}>
                        {e.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[d.text, { fontWeight: 'bold', fontSize: 14, marginBottom: 8, marginTop: 16 }]}>Componentes</Text>
              {modalCot?.items.map((item: any, i: number) => (
                <View key={i} style={[h.itemDetalle, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={[d.text, { flex: 1, fontSize: 13 }]}>{item.descripcion}</Text>
                  <Text style={[d.sub, { fontSize: 12 }]}>{item.cantidad} u.</Text>
                  <Text style={[d.text, { fontWeight: 'bold', fontSize: 13, marginLeft: 8 }]}>
                    ${(parseFloat(item.cantidad) * parseFloat(item.precio)).toLocaleString()}
                  </Text>
                </View>
              ))}

              {modalCot?.roi && (
                <View style={[h.roiResumen, { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)' }]}>
                  <Text style={[d.text, { fontWeight: 'bold', fontSize: 13, marginBottom: 8 }]}>Retorno de Inversión</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <RoiMini label="Ahorro/mes"   valor={`$${modalCot.roi.ahorroMensual?.toLocaleString()}`}  color="#10B981" />
                    <RoiMini label="Recuperación" valor={`${modalCot.roi.roiMeses} meses`}                    color="#0EA5E9" />
                    <RoiMini label="Ganancia 25a" valor={`$${Math.round(modalCot.roi.gananciaTotal25/1000)}k`} color="#F59E0B" />
                  </View>
                </View>
              )}

              <Text style={[d.text, { fontWeight: 'bold', fontSize: 14, marginBottom: 8, marginTop: 16 }]}>Notas internas</Text>
              <TextInput
                style={[h.notasInput, d.input]}
                placeholder="Agrega notas del proyecto..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={notaTemp}
                onChangeText={setNotaTemp}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity style={h.guardarNotaBtn} onPress={guardarNota}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar nota</Text>
              </TouchableOpacity>

              <View style={h.accionesRow}>
                <TouchableOpacity style={[h.accionBtn, { backgroundColor: '#0EA5E9' }]} onPress={() => regenaerPDF(modalCot!)}>
                  <Ionicons name="document-text-outline" size={20} color="#FFF" />
                  <Text style={h.accionTxt}>Re-generar PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[h.accionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => editarEnCotizacion(modalCot!)}>
                  <Ionicons name="create-outline" size={20} color="#FFF" />
                  <Text style={h.accionTxt}>Editar</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={h.eliminarBtn} onPress={() => eliminarCotizacion(modalCot!.id)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', marginLeft: 6 }}>Eliminar proyecto</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const StatCard = ({ label, valor, color, icon, d }: any) => (
  <View style={[h.statCard, d.card]}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={{ fontSize: 18, fontWeight: 'bold', color, marginTop: 4 }}>{valor}</Text>
    <Text style={[d.sub, { fontSize: 11, marginTop: 2 }]}>{label}</Text>
  </View>
);

const RoiMini = ({ label, valor, color }: any) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ fontSize: 12, color: '#64748B' }}>{label}</Text>
    <Text style={{ fontSize: 15, fontWeight: 'bold', color, marginTop: 2 }}>{valor}</Text>
  </View>
);

const h = StyleSheet.create({
  header:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:          { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statsRow:       { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  statCard:       { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginHorizontal: 4 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  // Sin maxHeight — se adapta al contenido y no aplasta los badges
  filtrosScroll:  { flexGrow: 0 },
  filtrosContent: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  // flexShrink:0 evita que el badge se encoja dentro del ScrollView horizontal
  filtroBadge:    { flexShrink: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#334155', marginRight: 8 },
  filtroBadgeTxt: { fontSize: 13, fontWeight: 'bold' },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  itemCard:       { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  itemRight:      { alignItems: 'flex-end', minWidth: 100, flexShrink: 0 },
  itemTotal:      { fontWeight: 'bold', fontSize: 16, color: '#10B981' },
  estadoBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
  estadoBadgeTxt: { fontSize: 11, marginLeft: 4, fontWeight: 'bold' },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalBox:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  totalBox:       { borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  estadosGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  estadoBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  itemDetalle:    { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 8 },
  roiResumen:     { borderWidth: 1.5, borderRadius: 10, padding: 14, marginTop: 16 },
  notasInput:     { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
  guardarNotaBtn: { backgroundColor: '#334155', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  accionesRow:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  accionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10 },
  accionTxt:      { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  eliminarBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444', marginBottom: 8 },
});
