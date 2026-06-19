// app/dashboard.tsx
import React, { useContext, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 72;
// ✅ Clave correcta — la misma que usa history.tsx
const HISTORY_KEY = 'historialCotizaciones';

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, color, maxVal, labelColor }: {
  data: { label: string; value: number }[];
  color: string;
  maxVal: number;
  labelColor: string;
}) {
  if (!data.length) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, marginTop: 8 }}>
      {data.map((item, i) => {
        const barH = maxVal > 0 ? Math.max(6, (item.value / maxVal) * 90) : 6;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: labelColor, marginBottom: 2, textAlign: 'center' }}>
              {item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : item.value.toFixed(1)}
            </Text>
            <View style={{ width: '60%', height: barH, backgroundColor: color, borderRadius: 4 }} />
            <Text style={{ fontSize: 9, color: labelColor, marginTop: 3, textAlign: 'center' }}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Color bar (desglose) ──────────────────────────────────────────────────────
function ColorBar({ segments, height = 14 }: {
  segments: { value: number; color: string; label: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  return (
    <View>
      <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', marginVertical: 8 }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flex: seg.value / total, backgroundColor: seg.color }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color, marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
              {seg.label} {Math.round((seg.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, isDark }: any) {
  return (
    <View style={[sc.statCard, {
      backgroundColor: isDark ? '#1E293B' : '#FFF',
      borderColor: isDark ? '#334155' : '#E2E8F0',
    }]}>
      <View style={[sc.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[sc.statVal, { color }]}>{value}</Text>
      <Text style={[sc.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
      {sub ? <Text style={[sc.statSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, children, isDark }: any) {
  return (
    <View style={[sc.section, {
      backgroundColor: isDark ? '#1E293B' : '#FFF',
      borderColor: isDark ? '#334155' : '#E2E8F0',
    }]}>
      <View style={sc.sectionHeader}>
        <View style={[sc.sectionIconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[sc.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── ROI Timeline ──────────────────────────────────────────────────────────────
function ROILineChart({ roiMeses, ahorroAnual, costoTotal, isDark }: {
  roiMeses: number; ahorroAnual: number; costoTotal: number; isDark: boolean;
}) {
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const pointsCount = 6;
  const yearlyData = Array.from({ length: pointsCount }, (_, i) => {
    const yr = i * 5;
    return { label: `${yr}a`, value: yr * ahorroAnual - costoTotal };
  });
  const maxV = Math.max(...yearlyData.map(d => d.value));
  const minV = Math.min(...yearlyData.map(d => d.value));
  const range = maxV - minV || 1;
  const chartH = 90;
  const pts = yearlyData.map((d, i) => ({
    x: (i / (pointsCount - 1)) * (CHART_W - 40),
    y: chartH - ((d.value - minV) / range) * chartH,
    label: d.label,
    value: d.value,
  }));

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: chartH + 32, position: 'relative', marginHorizontal: 4 }}>
        {minV < 0 && (
          <View style={{
            position: 'absolute',
            top: chartH - ((0 - minV) / range) * chartH,
            left: 0, right: 0, height: 1,
            backgroundColor: isDark ? '#334155' : '#CBD5E1',
          }} />
        )}
        {pts.map((pt, i) => (
          <View key={i} style={{ position: 'absolute', left: pt.x - 6, top: pt.y - 6 }}>
            <View style={{
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: pt.value >= 0 ? '#10B981' : '#EF4444',
              borderWidth: 2, borderColor: isDark ? '#1E293B' : '#FFF',
            }} />
          </View>
        ))}
        {pts.map((pt, i) => (
          <View key={`v${i}`} style={{ position: 'absolute', left: pt.x - 22, top: Math.max(0, pt.y - 18) }}>
            <Text style={{
              fontSize: 8, textAlign: 'center', width: 44,
              color: pt.value >= 0 ? '#10B981' : '#EF4444',
              fontWeight: 'bold',
            }}>
              {pt.value > 0 ? '+' : ''}
              {Math.abs(pt.value) >= 1000 ? `$${(pt.value / 1000).toFixed(0)}k` : `$${pt.value.toFixed(0)}`}
            </Text>
          </View>
        ))}
        {pts.map((pt, i) => (
          <View key={`l${i}`} style={{ position: 'absolute', left: pt.x - 16, top: chartH + 6 }}>
            <Text style={{ fontSize: 9, color: labelColor, textAlign: 'center', width: 32 }}>{pt.label}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 11, color: labelColor, marginTop: 4, textAlign: 'center' }}>
        Punto de equilibrio ≈ {roiMeses} meses ({(roiMeses / 12).toFixed(1)} años)
      </Text>
    </View>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isDark } = useContext(ThemeContext);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [selected, setSelected]         = useState<any>(null);
  const [loading, setLoading]           = useState(true);

  const bg  = isDark ? '#0F172A' : '#F8FAFC';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const sub = isDark ? '#94A3B8' : '#64748B';

  // Recarga cada vez que el tab se enfoca (igual que history.tsx)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(HISTORY_KEY).then(raw => {
        if (raw) {
          // history.tsx guarda el array ya invertido; volvemos a invertir para tener el más reciente primero
          const arr: any[] = JSON.parse(raw);
          // Filtrar solo los que tienen datos de ROI para que las gráficas tengan sentido
          const conRoi = arr.filter(c => c.roi && c.total > 0);
          setCotizaciones(conRoi);
          if (conRoi.length > 0) setSelected(conRoi[0]);
        }
        setLoading(false);
      });
    }, [])
  );

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: bg }]}>
        <Ionicons name="bar-chart" size={48} color="#0EA5E9" />
        <Text style={{ marginTop: 12, fontSize: 16, color: sub }}>Cargando dashboard...</Text>
      </SafeAreaView>
    );
  }

  // ── Sin datos ──
  if (!cotizaciones.length || !selected) {
    return (
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: bg }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="bar-chart-outline" size={72} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center', color: txt }}>
            Sin datos aún
          </Text>
          <Text style={{ fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22, color: sub }}>
            Genera una cotización desde la calculadora PRO y aparecerá aquí automáticamente.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Mapeo de campos desde estructura de cotización ──
  // La cotización guarda: { cliente, items, total, roi, fecha, estado }
  // roi viene de pro-calculator: { ahorroAnual, ahorroBimestral, ahorroMensual,
  //   roiMeses, gananciaTotal25, potenciaKWp, hspUsado }
  const roi    = selected.roi    || {};
  const total  = selected.total  || 0;
  const cliente = selected.cliente || 'Sin nombre';
  const items   = selected.items   || [];

  const ahorroAnual     = roi.ahorroAnual     || 0;
  const ahorroBimestral = roi.ahorroBimestral || 0;
  const ahorroMensual   = roi.ahorroMensual   || (ahorroAnual / 12);
  const roiMeses        = roi.roiMeses        || 0;
  const ganancia25      = roi.gananciaTotal25  || 0;
  const potenciaKW      = roi.potenciaKWp      || 0;
  const hspUsado        = roi.hspUsado         || 0;

  // Derivar costos desde items de la cotización
  const getItemTotal = (idx: number) => {
    if (!items[idx]) return 0;
    return parseFloat(items[idx].precio || '0') * parseFloat(items[idx].cantidad || '1');
  };
  const costoPaneles     = getItemTotal(0);
  const costoInversor    = getItemTotal(1);
  const costoInstalacion = getItemTotal(2);
  // Número de paneles desde cantidad del primer item
  const numPaneles = items[0] ? parseInt(items[0].cantidad || '0') : 0;
  // Consumo desde descripción del item de instalación si existe
  const consumoBase = 0; // no se guarda directamente en cotización

  // Ahorro mensual por mes (distribución uniforme si no hay HSP mensual)
  const mesesLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const mesesAhorro = mesesLabels.map(mes => ({ label: mes, value: ahorroMensual }));
  const maxAhorro   = ahorroMensual > 0 ? ahorroMensual * 1.2 : 1;

  // Producción estimada por mes (basada en HSP si está disponible)
  const hspBase = hspUsado || 4.5;
  const produccionMensual = mesesLabels.map(mes => ({
    label: mes,
    value: potenciaKW * hspBase * 30 * 0.8,
  }));
  const consumoEstimado = ahorroAnual > 0 ? (ahorroAnual / 12 / 1.5) * 1.2 : 300;
  const maxProd = Math.max(...produccionMensual.map(m => m.value), consumoEstimado);

  // Desglose de costos
  const costSegments = [
    { label: 'Paneles',      value: costoPaneles,     color: '#0EA5E9' },
    { label: 'Inversor',     value: costoInversor,    color: '#8B5CF6' },
    { label: 'Instalación',  value: costoInstalacion, color: '#F59E0B' },
  ].filter(s => s.value > 0);

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: bg }]} edges={['top','left','right']}>
      <ScrollView style={{ backgroundColor: bg }}>
        <View style={sc.container}>

          {/* Header */}
          <View style={sc.header}>
            <View>
              <Text style={[sc.title, { color: txt }]}>Dashboard Solar</Text>
              <Text style={[sc.sub, { color: sub }]}>Análisis de rendimiento</Text>
            </View>
            <View style={[sc.badge, { backgroundColor: '#10B98122' }]}>
              <Ionicons name="sunny" size={14} color="#10B981" />
              <Text style={[sc.badgeTxt, { color: '#10B981' }]}>PRO</Text>
            </View>
          </View>

          {/* Selector de cotización */}
          {cotizaciones.length > 1 && (
            <View style={[sc.pickerWrap, {
              backgroundColor: isDark ? '#1E293B' : '#FFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }]}>
              <Text style={{ fontSize: 12, marginBottom: 6, color: sub }}>Seleccionar cotización:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cotizaciones.slice(0, 10).map((c, i) => {
                  const isSel = c === selected;
                  return (
                    <TouchableOpacity key={i} onPress={() => setSelected(c)}
                      style={[sc.pickerItem, {
                        backgroundColor: isSel ? '#0EA5E9' : (isDark ? '#0F172A' : '#F1F5F9'),
                        borderColor: isSel ? '#0EA5E9' : (isDark ? '#334155' : '#E2E8F0'),
                      }]}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSel ? '#FFF' : sub }}>
                        {c.cliente || `Cotización ${cotizaciones.length - i}`}
                      </Text>
                      <Text style={{ fontSize: 10, color: isSel ? '#BAE6FD' : sub }}>
                        ${(c.total / 1000).toFixed(0)}k MXN
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* KPI Cards */}
          <View style={sc.kpiGrid}>
            <StatCard icon="trending-up"  color="#10B981" label="Ahorro/año"    value={`$${ahorroAnual.toLocaleString()}`}        sub="MXN estimado"          isDark={isDark} />
            <StatCard icon="time-outline" color="#0EA5E9" label="Recuperación" value={`${roiMeses} meses`}                        sub={`${(roiMeses/12).toFixed(1)} años`}    isDark={isDark} />
            <StatCard icon="flash"        color="#F59E0B" label="Potencia"     value={`${potenciaKW.toFixed(2)} kWp`}             sub={`${numPaneles} paneles`}              isDark={isDark} />
            <StatCard icon="cash-outline" color="#8B5CF6" label="Ganancia 25a" value={`$${Math.round(ganancia25/1000)}k`}         sub="MXN netos"             isDark={isDark} />
          </View>

          {/* ROI Timeline */}
          <SectionCard title="Retorno de Inversión — 25 años" icon="trending-up" color="#10B981" isDark={isDark}>
            <Text style={{ fontSize: 12, marginBottom: 4, color: sub }}>
              Inversión: <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>${total.toLocaleString()}</Text>
              {'  ·  '}Ahorro anual: <Text style={{ fontWeight: 'bold', color: '#10B981' }}>${ahorroAnual.toLocaleString()}</Text>
            </Text>
            <ROILineChart roiMeses={roiMeses} ahorroAnual={ahorroAnual} costoTotal={total} isDark={isDark} />
          </SectionCard>

          {/* Ahorro mensual */}
          <SectionCard title="Ahorro Mensual Estimado" icon="wallet-outline" color="#0EA5E9" isDark={isDark}>
            <Text style={{ fontSize: 12, marginBottom: 2, color: sub }}>Basado en tarifa CFE y producción solar</Text>
            <BarChart data={mesesAhorro} color="#0EA5E9" maxVal={maxAhorro} labelColor={isDark ? '#94A3B8' : '#64748B'} />
          </SectionCard>

          {/* Producción vs Consumo */}
          <SectionCard title="Producción Solar Estimada" icon="flash-outline" color="#F59E0B" isDark={isDark}>
            <Text style={{ fontSize: 12, marginBottom: 2, color: sub }}>
              kWh/mes · HSP usado: {hspBase.toFixed(2)} h · {potenciaKW.toFixed(2)} kWp
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, marginTop: 8 }}>
              {produccionMensual.map((item, i) => {
                const prodH = maxProd > 0 ? Math.max(6, (item.value / maxProd) * 90) : 6;
                const consH = maxProd > 0 ? Math.max(6, (consumoEstimado / maxProd) * 90) : 6;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      <View style={{ width: 6, height: prodH, backgroundColor: '#10B981', borderRadius: 2 }} />
                      <View style={{ width: 2 }} />
                      <View style={{ width: 6, height: consH, backgroundColor: '#EF4444', borderRadius: 2, opacity: 0.6 }} />
                    </View>
                    <Text style={{ fontSize: 8, color: isDark ? '#94A3B8' : '#64748B', marginTop: 3 }}>
                      {item.label.slice(0, 1)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, backgroundColor: '#10B981', borderRadius: 2, marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: sub }}>Producción solar</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 2, marginRight: 4, opacity: 0.6 }} />
                <Text style={{ fontSize: 11, color: sub }}>Consumo estimado</Text>
              </View>
            </View>
          </SectionCard>

          {/* Desglose de costos */}
          {costSegments.length > 0 && (
            <SectionCard title="Desglose de Inversión" icon="pie-chart-outline" color="#8B5CF6" isDark={isDark}>
              <Text style={{ fontSize: 12, marginBottom: 4, color: sub }}>
                Total: <Text style={{ fontWeight: 'bold', color: txt }}>${total.toLocaleString()} MXN</Text>
              </Text>
              <ColorBar segments={costSegments} />
              {costSegments.map((seg, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: seg.color, marginRight: 8 }} />
                    <Text style={{ fontSize: 13, color: sub }}>{seg.label}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: txt }}>${seg.value.toLocaleString()}</Text>
                    <Text style={{ fontSize: 11, color: sub }}>{total > 0 ? Math.round((seg.value / total) * 100) : 0}%</Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Resumen ejecutivo */}
          <SectionCard title="Resumen Ejecutivo" icon="document-text-outline" color="#0EA5E9" isDark={isDark}>
            {[
              { icon: 'person-outline',      color: sub,       txt: `Cliente: `, bold: cliente },
              { icon: 'flash-outline',       color: '#F59E0B', txt: `${numPaneles} paneles · ${potenciaKW.toFixed(2)} kWp instalados` },
              { icon: 'cash-outline',        color: '#10B981', txt: `Ahorro bimestral CFE: `, bold: `$${ahorroBimestral.toLocaleString()}` },
              { icon: 'calendar-outline',    color: '#0EA5E9', txt: `ROI en `, bold: `${roiMeses} meses (${(roiMeses/12).toFixed(1)} años)` },
              { icon: 'trending-up-outline', color: '#8B5CF6', txt: `Ganancia neta 25 años: `, bold: `$${Math.round(ganancia25/1000)}k MXN` },
              { icon: 'document-text',       color: '#94A3B8', txt: `Fecha: ${selected.fecha || '-'}` },
            ].map((row, i) => (
              <View key={i} style={sc.summaryRow}>
                <Ionicons name={row.icon as any} size={14} color={row.color} />
                <Text style={[sc.summaryTxt, { color: sub }]}>
                  {row.txt}
                  {row.bold ? <Text style={{ color: txt, fontWeight: 'bold' }}>{row.bold}</Text> : null}
                </Text>
              </View>
            ))}
          </SectionCard>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container:       { padding: 16, paddingBottom: 40 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:           { fontSize: 22, fontWeight: 'bold' },
  sub:             { fontSize: 13, marginTop: 2 },
  badge:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTxt:        { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 10 },
  statCard:        { width: (SCREEN_W - 52) / 2, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  iconCircle:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal:         { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  statLabel:       { fontSize: 12, marginTop: 2, textAlign: 'center' },
  statSub:         { fontSize: 10, marginTop: 2, textAlign: 'center' },
  section:         { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle:    { fontSize: 15, fontWeight: 'bold', flex: 1 },
  pickerWrap:      { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  pickerItem:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8, minWidth: 90, alignItems: 'center' },
  summaryRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  summaryTxt:      { fontSize: 13, flex: 1 },
});
