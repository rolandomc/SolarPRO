// app/dashboard.tsx
import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  TouchableOpacity, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 72;
const HISTORY_KEY = '@solarpro_history';

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, color, maxVal, labelColor }: {
  data: { label: string; value: number }[];
  color: string;
  maxVal: number;
  labelColor: string;
}) {
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

// ─── Donut Chart ───────────────────────────────────────────────────────────────
function DonutSegments({ segments, size = 120 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, R = size / 2 - 10, r = size / 2 - 28;
  let startAngle = -Math.PI / 2;
  const paths = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle);
    const y2 = cy + R * Math.sin(startAngle + angle);
    const ix1 = cx + r * Math.cos(startAngle + angle);
    const iy1 = cy + r * Math.sin(startAngle + angle);
    const ix2 = cx + r * Math.cos(startAngle);
    const iy2 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
    startAngle += angle;
    return { d, color: seg.color };
  });

  // SVG via manual drawing fallback using View rings
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* Simulated donut using overlapping arcs as colored bars in a circle layout */}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', position: 'relative' }}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          return (
            <View key={i} style={{
              position: 'absolute', left: 0, bottom: 0,
              width: `${pct * 100}%`,
              height: '100%',
              backgroundColor: seg.color,
              opacity: 0.85,
            }} />
          );
        })}
      </View>
      <View style={{
        position: 'absolute', width: size * 0.52, height: size * 0.52,
        borderRadius: size, backgroundColor: 'transparent'
      }} />
    </View>
  );
}

// ─── Ring visual (simpler) ─────────────────────────────────────────────────────
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
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
  const bg = isDark ? '#1E293B' : '#FFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  return (
    <View style={[sc.statCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[sc.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[sc.statVal, { color }]}>{value}</Text>
      <Text style={[sc.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
      {sub ? <Text style={[sc.statSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Section Card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon, color, children, isDark }: any) {
  const bg = isDark ? '#1E293B' : '#FFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  return (
    <View style={[sc.section, { backgroundColor: bg, borderColor: border }]}>
      <View style={sc.sectionHeader}>
        <View style={[sc.sectionIconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[sc.sectionTitle, { color: txt }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── ROI Timeline Line Chart (manual) ─────────────────────────────────────────
function ROILineChart({ roiMeses, ahorroAnual, costoTotal, isDark }: {
  roiMeses: number; ahorroAnual: number; costoTotal: number; isDark: boolean;
}) {
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const years = 25;
  const pointsCount = 6; // 0, 5, 10, 15, 20, 25 años
  const yearlyData = Array.from({ length: pointsCount }, (_, i) => {
    const yr = i * Math.floor(years / (pointsCount - 1));
    const acum = yr * ahorroAnual - costoTotal;
    return { label: `${yr}a`, value: acum };
  });
  const maxV = Math.max(...yearlyData.map(d => d.value));
  const minV = Math.min(...yearlyData.map(d => d.value));
  const range = maxV - minV || 1;
  const chartH = 90;
  const pts = yearlyData.map((d, i) => ({
    x: (i / (pointsCount - 1)) * CHART_W,
    y: chartH - ((d.value - minV) / range) * chartH,
    label: d.label,
    value: d.value,
  }));

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: chartH + 30, position: 'relative' }}>
        {/* Zero line */}
        {minV < 0 && (
          <View style={{
            position: 'absolute',
            top: chartH - ((0 - minV) / range) * chartH,
            left: 0, right: 0, height: 1,
            backgroundColor: isDark ? '#334155' : '#CBD5E1',
          }} />
        )}
        {/* Bars / points */}
        {pts.map((pt, i) => (
          <View key={i} style={{ position: 'absolute', left: pt.x - 18, top: pt.y - 6 }}>
            <View style={{
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: pt.value >= 0 ? '#10B981' : '#EF4444',
              borderWidth: 2, borderColor: isDark ? '#1E293B' : '#FFF'
            }} />
          </View>
        ))}
        {/* Labels */}
        {pts.map((pt, i) => (
          <View key={`l${i}`} style={{ position: 'absolute', left: pt.x - 18, top: chartH + 4 }}>
            <Text style={{ fontSize: 9, color: labelColor, textAlign: 'center', width: 36 }}>{pt.label}</Text>
          </View>
        ))}
        {/* Value labels */}
        {pts.map((pt, i) => (
          <View key={`v${i}`} style={{ position: 'absolute', left: pt.x - 24, top: pt.y - 18 }}>
            <Text style={{
              fontSize: 8, textAlign: 'center', width: 48,
              color: pt.value >= 0 ? '#10B981' : '#EF4444',
              fontWeight: 'bold'
            }}>
              {pt.value > 0 ? '+' : ''}{pt.value >= 1000 || pt.value <= -1000
                ? `$${(pt.value / 1000).toFixed(0)}k`
                : `$${pt.value.toFixed(0)}`}
            </Text>
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
  const [calculos, setCalculos] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const bg   = isDark ? '#0F172A' : '#F8FAFC';
  const txt  = isDark ? '#F1F5F9' : '#0F172A';
  const sub  = isDark ? '#94A3B8' : '#64748B';
  const card = { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' };

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) {
        const arr = JSON.parse(raw);
        setCalculos(arr.reverse());
        if (arr.length > 0) setSelected(arr[0]);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: bg }]}>
        <Ionicons name="bar-chart" size={48} color="#0EA5E9" />
        <Text style={[{ marginTop: 12, fontSize: 16 }, { color: sub }]}>Cargando dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (calculos.length === 0 || !selected) {
    return (
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: bg }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="bar-chart-outline" size={72} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={[{ fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }, { color: txt }]}>
            Sin datos aún
          </Text>
          <Text style={[{ fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }, { color: sub }]}>
            Realiza un cálculo en la calculadora PRO para ver el dashboard con gráficas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const roi         = selected?.roi || {};
  const hspMeta     = selected?.hspMeta || {};
  const costoTotal  = selected?.costoTotal || 0;
  const costoPaneles    = selected?.costoPaneles || 0;
  const costoInversor   = selected?.costoInversor || 0;
  const costoInstalacion = selected?.costoInstalacion || 0;
  const numPaneles  = selected?.numPaneles || 0;
  const potenciaKW  = selected?.potenciaKW || 0;
  const clienteNom  = selected?.cliente || 'Sin nombre';

  const ahorroAnual     = roi.ahorroAnual || 0;
  const ahorroBimestral = roi.ahorroBimestral || 0;
  const roiMeses        = roi.roiMeses || 0;
  const ganancia25      = roi.gananciaTotal25 || 0;

  // Monthly HSP data
  const mesesHsp: { label: string; value: number }[] = (hspMeta.meses || []).map((m: any) => ({
    label: m.mes?.slice(0, 3) || '',
    value: m.valor || 0,
  }));
  const maxHsp = mesesHsp.length ? Math.max(...mesesHsp.map(m => m.value)) : 6;

  // Ahorro mensual estimado
  const ahorroMensual = ahorroAnual / 12;
  const mesesAhorro = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((mes, i) => ({
    label: mes,
    value: mesesHsp[i] ? (mesesHsp[i].value / (maxHsp || 5.5)) * ahorroMensual : ahorroMensual,
  }));
  const maxAhorro = Math.max(...mesesAhorro.map(m => m.value));

  // Producción estimada mensual (kWh)
  const consumoBase = selected?.consumo ? parseFloat(selected.consumo) : 0;
  const produccionMensual = mesesHsp.length ? mesesHsp.map(m => ({
    label: m.label,
    value: potenciaKW * m.value * 30 * 0.8, // eficiencia 80%
  })) : Array.from({ length: 12 }, (_, i) => ({
    label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i],
    value: potenciaKW * 4.5 * 30 * 0.8,
  }));
  const maxProd = Math.max(...produccionMensual.map(m => m.value));

  // Costos desglosados
  const costSegments = [
    { label: 'Paneles', value: costoPaneles, color: '#0EA5E9' },
    { label: 'Inversor', value: costoInversor, color: '#8B5CF6' },
    { label: 'Instalación', value: costoInstalacion, color: '#F59E0B' },
  ];

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

          {/* Selector de cálculo */}
          {calculos.length > 1 && (
            <View style={[sc.pickerWrap, card]}>
              <Text style={[{ fontSize: 12, marginBottom: 6 }, { color: sub }]}>Seleccionar cálculo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {calculos.slice(0, 8).map((c, i) => {
                  const isSel = c === selected;
                  return (
                    <TouchableOpacity key={i} onPress={() => setSelected(c)}
                      style={[sc.pickerItem, {
                        backgroundColor: isSel ? '#0EA5E9' : (isDark ? '#0F172A' : '#F1F5F9'),
                        borderColor: isSel ? '#0EA5E9' : (isDark ? '#334155' : '#E2E8F0'),
                      }]}>
                      <Text style={[{ fontSize: 12, fontWeight: 'bold' }, { color: isSel ? '#FFF' : sub }]}>
                        {c.cliente || `Cálculo ${calculos.length - i}`}
                      </Text>
                      <Text style={[{ fontSize: 10 }, { color: isSel ? '#BAE6FD' : sub }]}>
                        {c.potenciaKW ? `${c.potenciaKW.toFixed(1)} kWp` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* KPI Cards */}
          <View style={sc.kpiGrid}>
            <StatCard icon="trending-up"      color="#10B981" label="Ahorro/año"      value={`$${ahorroAnual.toLocaleString()}`}         sub="MXN estimado"         isDark={isDark} />
            <StatCard icon="time-outline"     color="#0EA5E9" label="Recuperación"   value={`${roiMeses} meses`}                         sub={`${(roiMeses/12).toFixed(1)} años`}   isDark={isDark} />
            <StatCard icon="flash"            color="#F59E0B" label="Potencia"       value={`${potenciaKW.toFixed(2)} kWp`}               sub={`${numPaneles} paneles`}             isDark={isDark} />
            <StatCard icon="cash-outline"     color="#8B5CF6" label="Ganancia 25a"   value={`$${Math.round(ganancia25/1000)}k`}            sub="MXN netos"            isDark={isDark} />
          </View>

          {/* ROI Timeline */}
          <SectionCard title="Retorno de Inversión — 25 años" icon="trending-up" color="#10B981" isDark={isDark}>
            <Text style={[{ fontSize: 12, marginBottom: 4 }, { color: sub }]}>
              Inversión inicial: <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>${costoTotal.toLocaleString()}</Text>
              {'  '}·{'  '}Ahorro anual: <Text style={{ fontWeight: 'bold', color: '#10B981' }}>${ahorroAnual.toLocaleString()}</Text>
            </Text>
            <ROILineChart
              roiMeses={roiMeses}
              ahorroAnual={ahorroAnual}
              costoTotal={costoTotal}
              isDark={isDark}
            />
          </SectionCard>

          {/* Ahorro mensual estimado */}
          <SectionCard title="Ahorro Mensual Estimado" icon="wallet-outline" color="#0EA5E9" isDark={isDark}>
            <Text style={[{ fontSize: 12, marginBottom: 2 }, { color: sub }]}>
              Basado en HSP por mes y tarifa CFE
            </Text>
            <BarChart
              data={mesesAhorro}
              color="#0EA5E9"
              maxVal={maxAhorro}
              labelColor={isDark ? '#94A3B8' : '#64748B'}
            />
          </SectionCard>

          {/* Producción vs Consumo */}
          <SectionCard title="Producción vs Consumo" icon="flash-outline" color="#F59E0B" isDark={isDark}>
            <Text style={[{ fontSize: 12, marginBottom: 2 }, { color: sub }]}>
              kWh/mes · Consumo base: {consumoBase} kWh
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, marginTop: 8 }}>
              {produccionMensual.map((item, i) => {
                const prodH = maxProd > 0 ? Math.max(6, (item.value / maxProd) * 90) : 6;
                const consH = maxProd > 0 ? Math.max(6, (consumoBase / maxProd) * 90) : 6;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                      <View style={{ width: 6, height: prodH, backgroundColor: '#10B981', borderRadius: 2 }} />
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
                <Text style={{ fontSize: 11, color: sub }}>Consumo CFE</Text>
              </View>
            </View>
          </SectionCard>

          {/* Radiación Solar HSP */}
          {mesesHsp.length > 0 && (
            <SectionCard title="Radiación Solar (HSP/mes)" icon="sunny-outline" color="#F59E0B" isDark={isDark}>
              <Text style={[{ fontSize: 12, marginBottom: 2 }, { color: sub }]}>
                {hspMeta.ciudad || 'Ubicación GPS'} · Promedio: {hspMeta.anual?.toFixed(2) || '-'} h pico
              </Text>
              <BarChart
                data={mesesHsp}
                color="#F59E0B"
                maxVal={maxHsp}
                labelColor={isDark ? '#94A3B8' : '#64748B'}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: 11, color: '#10B981' }}>✦ Mejor: {hspMeta.mejor?.mes} {hspMeta.mejor?.valor?.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: '#EF4444' }}>✦ Peor: {hspMeta.peor?.mes} {hspMeta.peor?.valor?.toFixed(2)}</Text>
              </View>
            </SectionCard>
          )}

          {/* Desglose de Costos */}
          <SectionCard title="Desglose de Inversión" icon="pie-chart-outline" color="#8B5CF6" isDark={isDark}>
            <Text style={[{ fontSize: 12, marginBottom: 4 }, { color: sub }]}>
              Total: <Text style={{ fontWeight: 'bold', color: txt }}>${costoTotal.toLocaleString()} MXN</Text>
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
                  <Text style={{ fontSize: 11, color: sub }}>{costoTotal > 0 ? Math.round((seg.value / costoTotal) * 100) : 0}%</Text>
                </View>
              </View>
            ))}
          </SectionCard>

          {/* Resumen ejecutivo */}
          <SectionCard title="Resumen Ejecutivo" icon="document-text-outline" color="#0EA5E9" isDark={isDark}>
            <View style={sc.summaryRow}>
              <Ionicons name="person-outline" size={14} color={sub} />
              <Text style={[sc.summaryTxt, { color: sub }]}>Cliente: <Text style={{ color: txt, fontWeight: 'bold' }}>{clienteNom}</Text></Text>
            </View>
            <View style={sc.summaryRow}>
              <Ionicons name="flash-outline" size={14} color="#F59E0B" />
              <Text style={[sc.summaryTxt, { color: sub }]}>{numPaneles} paneles · {potenciaKW.toFixed(2)} kWp instalados</Text>
            </View>
            <View style={sc.summaryRow}>
              <Ionicons name="cash-outline" size={14} color="#10B981" />
              <Text style={[sc.summaryTxt, { color: sub }]}>Ahorro bimestral CFE: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>${ahorroBimestral.toLocaleString()}</Text></Text>
            </View>
            <View style={sc.summaryRow}>
              <Ionicons name="calendar-outline" size={14} color="#0EA5E9" />
              <Text style={[sc.summaryTxt, { color: sub }]}>ROI en <Text style={{ color: '#0EA5E9', fontWeight: 'bold' }}>{roiMeses} meses</Text> ({(roiMeses/12).toFixed(1)} años)</Text>
            </View>
            <View style={sc.summaryRow}>
              <Ionicons name="trending-up-outline" size={14} color="#8B5CF6" />
              <Text style={[sc.summaryTxt, { color: sub }]}>Ganancia neta a 25 años: <Text style={{ color: '#8B5CF6', fontWeight: 'bold' }}>${Math.round(ganancia25/1000)}k MXN</Text></Text>
            </View>
          </SectionCard>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container:      { padding: 16, paddingBottom: 40 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:          { fontSize: 22, fontWeight: 'bold' },
  sub:            { fontSize: 13, marginTop: 2 },
  badge:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTxt:       { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  kpiGrid:        { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 10 },
  statCard:       { width: (SCREEN_W - 52) / 2, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  iconCircle:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal:        { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  statLabel:      { fontSize: 12, marginTop: 2, textAlign: 'center' },
  statSub:        { fontSize: 10, marginTop: 2, textAlign: 'center' },
  section:        { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconWrap:{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle:   { fontSize: 15, fontWeight: 'bold', flex: 1 },
  pickerWrap:     { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  pickerItem:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8, minWidth: 80, alignItems: 'center' },
  summaryRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  summaryTxt:     { fontSize: 13, flex: 1 },
});
