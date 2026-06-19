// app/index.tsx
import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ThemeContext } from './_layout';
import { procesarDocumentoOCR } from '../utils/ocrService';
import { useRouter } from 'expo-router';
import LoadingOverlay from '../components/LoadingOverlay';

const { width: SCREEN_W } = Dimensions.get('window');

const TARIFAS_CFE = [
  { key: 'DAC',    label: 'DAC (Alto consumo)',     tarifa: 5.20, color: '#EF4444' },
  { key: '1F',     label: 'Residencial 1F',         tarifa: 2.80, color: '#F59E0B' },
  { key: '1C',     label: 'Residencial 1C (calor)', tarifa: 2.10, color: '#F97316' },
  { key: 'BT',     label: 'Comercial BT',           tarifa: 3.50, color: '#8B5CF6' },
  { key: 'MANUAL', label: 'Capturar manualmente',   tarifa: 0,    color: '#64748B' },
];

const PANEL_PRESETS = [
  { label: '400W', value: '400' },
  { label: '450W', value: '450' },
  { label: '550W', value: '550' },
  { label: '670W', value: '670' },
];

const AHORRO_PRESETS = [
  { label: '50%',  value: '50'  },
  { label: '75%',  value: '75'  },
  { label: '90%',  value: '90'  },
  { label: '100%', value: '100' },
];

const HSP_DEFAULT         = 5.5;
const COSTO_INSTALACION_W = 20;

export default function Index() {
  const { isDark } = useContext(ThemeContext);
  const router     = useRouter();

  const [cliente,          setCliente]          = useState('');
  const [consumoMensual,   setConsumoMensual]   = useState('');
  const [potenciaPanel,    setPotenciaPanel]    = useState('');
  const [porcentajeAhorro, setPorcentajeAhorro] = useState('100');
  const [tarifaKey,        setTarifaKey]        = useState('1F');
  const [tarifaManual,     setTarifaManual]     = useState('');
  const [resultados,       setResultados]       = useState<any>(null);
  const [datosOCR,         setDatosOCR]         = useState<any>(null);
  const [loading,          setLoading]          = useState(false);
  const [loadingMsg,       setLoadingMsg]       = useState('');

  const tarifaActiva = TARIFAS_CFE.find(t => t.key === tarifaKey)!;
  const tarifaFinal  = tarifaKey === 'MANUAL'
    ? parseFloat(tarifaManual) || 0
    : tarifaActiva.tarifa;

  const limpiarTodo = () => {
    setCliente('');
    setConsumoMensual('');
    setPotenciaPanel('');
    setPorcentajeAhorro('100');
    setTarifaKey('1F');
    setTarifaManual('');
    setResultados(null);
    setDatosOCR(null);
  };

  const d = {
    bg:    { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    text:  { color: isDark ? '#F1F5F9' : '#0F172A' },
    sub:   { color: isDark ? '#94A3B8' : '#64748B' },
    input: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: isDark ? '#F8FAFC' : '#0F172A' },
    card:  { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
  };

  const escanearRecibo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setLoadingMsg('Leyendo recibo CFE...');
        setLoading(true);
        try {
          const file = result.assets[0];
          const r = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || 'application/pdf');
          if (!r.exito) { Alert.alert('Error OCR', r.error); return; }
          if (r.consumo) {
            setConsumoMensual(r.consumo);
            setDatosOCR(r);
            if (r.cliente) setCliente(r.cliente);
            if (r.tipoConexion?.tarifa) {
              const match = TARIFAS_CFE.find(t =>
                r.tipoConexion.tarifa.toLowerCase().includes(t.key.toLowerCase()));
              if (match) setTarifaKey(match.key);
            }
          } else {
            Alert.alert('Revisión manual', 'No se encontró el consumo en el formato esperado.');
          }
        } finally {
          setLoading(false);
        }
      }
    } catch { Alert.alert('Error', 'Fallo al seleccionar el archivo.'); }
  };

  const calcularSistema = () => {
    const consumo  = parseFloat(consumoMensual);
    const panelW   = parseFloat(potenciaPanel);
    const pct      = parseFloat(porcentajeAhorro) / 100;
    const tarifa   = tarifaFinal;

    if (isNaN(consumo) || consumo <= 0)  return Alert.alert('Datos incompletos', 'Ingresa el consumo mensual en kWh.');
    if (isNaN(panelW)  || panelW <= 0)   return Alert.alert('Datos incompletos', 'Selecciona o ingresa la potencia del panel.');
    if (tarifa <= 0)                     return Alert.alert('Tarifa inválida', 'Ingresa la tarifa CFE en MXN/kWh.');

    const energiaDiaria     = (consumo / 30) * 1.20 * pct;
    const potenciaArregloKW = energiaDiaria / HSP_DEFAULT;
    const numPaneles        = Math.ceil((potenciaArregloKW * 1000) / panelW);
    const potenciaInstalada = (numPaneles * panelW) / 1000;
    const inversorMin       = potenciaInstalada * 0.9;
    const produccionMensual = potenciaInstalada * HSP_DEFAULT * 30 * 0.8;
    const ahorroMensual     = produccionMensual * tarifa;
    const costoEstimado     = potenciaInstalada * 1000 * COSTO_INSTALACION_W;
    const roiMeses          = ahorroMensual > 0 ? costoEstimado / ahorroMensual : 0;
    const ahorroAnual       = ahorroMensual * 12;
    const ganancia25        = ahorroAnual * 25 - costoEstimado;
    const cobertura         = Math.min(100, Math.round((produccionMensual / consumo) * 100));

    const roiCompleto = {
      ahorroAnual,
      ahorroBimestral: ahorroMensual * 2,
      ahorroMensual,
      roiMeses:        Math.round(roiMeses),
      roiAnos:         (roiMeses / 12).toFixed(1),
      gananciaTotal25: ganancia25,
      ahorroTotal25:   ahorroAnual * 25,
      potenciaKWp:     potenciaInstalada,
      hspUsado:        HSP_DEFAULT,
      tarifa:          tarifaKey === 'MANUAL' ? 'Manual' : tarifaActiva.label,
      precioKwh:       tarifaFinal,
      kwGeneradosMes:  produccionMensual,
    };

    setResultados({
      numPaneles, potenciaInstalada, inversorMin,
      ahorroMensual, ahorroAnual, costoEstimado,
      roiMeses, ganancia25, cobertura, tarifa,
      produccionMensual, roi: roiCompleto,
    });
  };

  const irAPro = () => {
    router.push({
      pathname: '/pro-calculator',
      params: { consumoParam: consumoMensual, clienteParam: cliente },
    });
  };

  const irACotizar = () => {
    if (!resultados) return;
    const items = JSON.stringify([
      { id: '1', descripcion: `Paneles solares ${potenciaPanel}W (x${resultados.numPaneles})`, cantidad: String(resultados.numPaneles), precio: String(Math.round(resultados.costoEstimado * 0.55 / resultados.numPaneles)) },
      { id: '2', descripcion: `Inversor ${resultados.inversorMin.toFixed(1)} kW`, cantidad: '1', precio: String(Math.round(resultados.costoEstimado * 0.25)) },
      { id: '3', descripcion: `Instalación y materiales ${resultados.potenciaInstalada.toFixed(2)} kWp`, cantidad: '1', precio: String(Math.round(resultados.costoEstimado * 0.20)) },
    ]);
    router.push({
      pathname: '/quotes',
      params: { clienteParam: cliente || 'Cliente', itemsParam: items, roiParam: JSON.stringify(resultados.roi) },
    });
  };

  return (
    <SafeAreaView style={[s.safe, d.bg]} edges={['top','left','right']}>
      <ScrollView contentContainerStyle={[s.scroll, d.bg]}>

        {/* Header — solo botón Nuevo si hay datos */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerTitle, d.text]}>Calculadora Solar</Text>
            <Text style={[s.headerSub, d.sub]}>Estimación rápida</Text>
          </View>
          {(resultados || cliente || consumoMensual) && (
            <TouchableOpacity
              style={[s.clearBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
              onPress={limpiarTodo}
            >
              <Ionicons name="refresh" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[s.clearTxt, { color: isDark ? '#94A3B8' : '#64748B' }]}>Nuevo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tarjeta OCR */}
        {datosOCR && (
          <View style={[s.card, { backgroundColor: isDark ? '#0F2A1A' : '#F0FDF4', borderColor: isDark ? '#166534' : '#86EFAC' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={{ color: '#10B981', fontWeight: 'bold', marginLeft: 6 }}>Datos extraídos del recibo</Text>
            </View>
            {datosOCR.cliente ? <Text style={[d.sub, { fontSize: 13 }]}>Cliente: <Text style={[d.text, { fontWeight: 'bold' }]}>{datosOCR.cliente}</Text></Text> : null}
            <Text style={[d.sub, { fontSize: 13, marginTop: 2 }]}>Consumo: <Text style={{ fontWeight: 'bold', color: '#10B981' }}>{consumoMensual} kWh/mes</Text></Text>
            {datosOCR.bimestres?.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {datosOCR.bimestres.map((b: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={[d.sub, { fontSize: 12 }]}>{b.periodo}</Text>
                    <Text style={[d.text, { fontWeight: 'bold', fontSize: 12 }]}>{b.kwh} kWh</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Formulario */}
        <View style={[s.card, d.card]}>
          <Text style={[s.sectionTitle, d.text]}>Datos del proyecto</Text>

          <Text style={[s.label, d.sub]}>Nombre del cliente (opcional)</Text>
          <TextInput
            style={[s.input, d.input, { marginBottom: 14 }]}
            placeholder="Ej. Juan Pérez / Empresa SA"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={cliente} onChangeText={setCliente}
          />

          <Text style={[s.label, d.sub]}>Consumo mensual (kWh)</Text>
          <TextInput
            style={[s.input, d.input, { marginBottom: 14 }]}
            keyboardType="numeric"
            placeholder="Ej. 350"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={consumoMensual} onChangeText={setConsumoMensual}
          />

          <Text style={[s.label, d.sub]}>Tarifa CFE</Text>
          <View style={s.presetRow}>
            {TARIFAS_CFE.map(t => (
              <TouchableOpacity key={t.key}
                style={[s.presetChip, { borderColor: t.color, backgroundColor: tarifaKey === t.key ? t.color : 'transparent' }]}
                onPress={() => setTarifaKey(t.key)}>
                <Text style={[s.presetTxt, { color: tarifaKey === t.key ? '#FFF' : t.color }]}>{t.label.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tarifaKey !== 'MANUAL' ? (
            <Text style={[{ fontSize: 12, marginBottom: 14, marginTop: 4 }, d.sub]}>
              {tarifaActiva.label} · <Text style={{ color: tarifaActiva.color, fontWeight: 'bold' }}>${tarifaActiva.tarifa.toFixed(2)}/kWh</Text>
            </Text>
          ) : (
            <TextInput
              style={[s.input, d.input, { marginTop: 8, marginBottom: 14 }]}
              keyboardType="decimal-pad"
              placeholder="Tarifa en MXN/kWh (ej. 3.20)"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={tarifaManual} onChangeText={setTarifaManual}
            />
          )}

          <Text style={[s.label, d.sub]}>Potencia del panel (W)</Text>
          <View style={s.presetRow}>
            {PANEL_PRESETS.map(p => (
              <TouchableOpacity key={p.value}
                style={[s.presetChip, { borderColor: '#0EA5E9', backgroundColor: potenciaPanel === p.value ? '#0EA5E9' : 'transparent' }]}
                onPress={() => setPotenciaPanel(p.value)}>
                <Text style={[s.presetTxt, { color: potenciaPanel === p.value ? '#FFF' : '#0EA5E9' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[s.input, d.input, { marginTop: 8, marginBottom: 14 }]}
            keyboardType="numeric"
            placeholder="O escribe la potencia exacta (W)"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={potenciaPanel} onChangeText={setPotenciaPanel}
          />

          <Text style={[s.label, d.sub]}>Porcentaje de ahorro objetivo</Text>
          <View style={s.presetRow}>
            {AHORRO_PRESETS.map(a => (
              <TouchableOpacity key={a.value}
                style={[s.presetChip, { borderColor: '#10B981', backgroundColor: porcentajeAhorro === a.value ? '#10B981' : 'transparent' }]}
                onPress={() => setPorcentajeAhorro(a.value)}>
                <Text style={[s.presetTxt, { color: porcentajeAhorro === a.value ? '#FFF' : '#10B981' }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[s.input, d.input, { marginTop: 8, marginBottom: 14 }]}
            keyboardType="numeric"
            placeholder="O escribe el % exacto (1-100)"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={porcentajeAhorro} onChangeText={setPorcentajeAhorro}
          />

          {/* Botón Recibo CFE — único, dentro del formulario */}
          <TouchableOpacity style={s.scanBtn} onPress={escanearRecibo}>
            <Ionicons name="document-attach" size={20} color="#FFF" />
            <Text style={s.scanTxt}>Escanear Recibo CFE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.calcBtn} onPress={calcularSistema}>
            <Ionicons name="flash" size={20} color="#FFF" />
            <Text style={s.calcBtnTxt}>Calcular sistema</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados */}
        {resultados && (
          <View style={[s.card, d.card, { marginTop: 8 }]}>
            <Text style={[s.sectionTitle, d.text]}>Resultados del sistema</Text>
            <View style={s.kpiGrid}>
              <KPICard icon="sunny"         color="#F59E0B" label="Paneles"       value={String(resultados.numPaneles)}                               sub={`${resultados.potenciaInstalada.toFixed(2)} kWp`}           isDark={isDark} />
              <KPICard icon="hardware-chip" color="#0EA5E9" label="Inversor mín." value={`${resultados.inversorMin.toFixed(1)} kW`}                   sub="capacidad mínima"                                           isDark={isDark} />
              <KPICard icon="trending-up"   color="#10B981" label="Ahorro/mes"    value={`$${Math.round(resultados.ahorroMensual).toLocaleString()}`}  sub={`$${Math.round(resultados.ahorroAnual).toLocaleString()}/año`} isDark={isDark} />
              <KPICard icon="time-outline"  color="#8B5CF6" label="Recuperación"  value={`${(resultados.roiMeses / 12).toFixed(1)} años`}              sub={`${Math.round(resultados.roiMeses)} meses`}                 isDark={isDark} />
            </View>

            <View style={[s.coberturaWrap, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[d.text, { fontWeight: 'bold', fontSize: 14 }]}>Cobertura solar</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: resultados.cobertura >= 90 ? '#10B981' : resultados.cobertura >= 60 ? '#F59E0B' : '#EF4444' }}>
                  {resultados.cobertura}%
                </Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${resultados.cobertura}%`, backgroundColor: resultados.cobertura >= 90 ? '#10B981' : resultados.cobertura >= 60 ? '#F59E0B' : '#EF4444' }]} />
              </View>
              <Text style={[d.sub, { fontSize: 12, marginTop: 6 }]}>
                Producción estimada: <Text style={[d.text, { fontWeight: 'bold' }]}>{Math.round(resultados.produccionMensual)} kWh/mes</Text>
                {'  ·  '}Consumo: <Text style={[d.text, { fontWeight: 'bold' }]}>{consumoMensual} kWh/mes</Text>
              </Text>
            </View>

            <View style={[s.roiWrap, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[d.text, { fontWeight: 'bold', fontSize: 14 }]}>Retorno de inversión</Text>
                <View style={[s.roiBadge, { backgroundColor: '#10B98122' }]}>
                  <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>{(resultados.roiMeses / 12).toFixed(1)} años</Text>
                </View>
              </View>
              {[
                { label: 'Inversión inicial', val: `$${resultados.costoEstimado.toLocaleString()}`,            color: '#EF4444' },
                { label: 'Ahorro anual',      val: `$${Math.round(resultados.ahorroAnual).toLocaleString()}`,  color: '#10B981' },
                { label: 'Ganancia 25 años',  val: `$${Math.round(resultados.ganancia25 / 1000)}k`,            color: '#8B5CF6' },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[d.sub, { fontSize: 13 }]}>{row.label}</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: row.color }}>{row.val}</Text>
                </View>
              ))}
              <View style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[d.sub, { fontSize: 11 }]}>0</Text>
                  <Text style={[d.sub, { fontSize: 11, color: '#10B981' }]}>Recuperación: año {(resultados.roiMeses / 12).toFixed(1)}</Text>
                  <Text style={[d.sub, { fontSize: 11 }]}>25 años</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${Math.min(100, (resultados.roiMeses / (25 * 12)) * 100)}%`, backgroundColor: '#EF4444', borderRadius: 0 }]} />
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { marginLeft: `${Math.min(100, (resultados.roiMeses / (25 * 12)) * 100)}%`, width: `${Math.max(0, 100 - (resultados.roiMeses / (25 * 12)) * 100)}%`, backgroundColor: '#10B981', borderRadius: 0 }]} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 6, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 2, marginRight: 4 }} />
                  <Text style={[d.sub, { fontSize: 11 }]}>Pagando inversión</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, backgroundColor: '#10B981', borderRadius: 2, marginRight: 4 }} />
                  <Text style={[d.sub, { fontSize: 11 }]}>Ganancia neta</Text>
                </View>
              </View>
            </View>

            <Text style={[d.sub, { fontSize: 12, textAlign: 'center', marginTop: 4 }]}>
              Tarifa usada: <Text style={{ fontWeight: 'bold', color: tarifaActiva.color }}>${resultados.tarifa.toFixed(2)}/kWh</Text>
              {'  ·  '}HSP: <Text style={{ fontWeight: 'bold', color: d.text.color }}>{HSP_DEFAULT} h</Text>
            </Text>

            <View style={s.ctaRow}>
              <TouchableOpacity style={[s.ctaBtn, { backgroundColor: '#10B981' }]} onPress={irACotizar}>
                <Ionicons name="document-text-outline" size={18} color="#FFF" />
                <Text style={s.ctaTxt}>Cotizar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ctaBtn, { backgroundColor: '#F59E0B' }]} onPress={irAPro}>
                <Ionicons name="flash" size={18} color="#FFF" />
                <Text style={s.ctaTxt}>Refinar en PRO</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.newQuoteBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
              onPress={limpiarTodo}
            >
              <Ionicons name="add-circle-outline" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[s.newQuoteTxt, { color: isDark ? '#94A3B8' : '#64748B' }]}>Nueva cotización</Text>
            </TouchableOpacity>
          </View>
        )}

        {!resultados && (
          <TouchableOpacity style={[s.proBanner, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#FFF' }]} onPress={() => router.push('/pro-calculator')}>
            <View style={s.proBannerIcon}>
              <Ionicons name="flash" size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[d.text, { fontWeight: 'bold', fontSize: 14 }]}>Cálculo PRO disponible</Text>
              <Text style={[d.sub, { fontSize: 12 }]}>Incluye NOM-001, inversores, strings y HSP NASA</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <LoadingOverlay
        visible={loading}
        mensaje={loadingMsg}
        icono="document-text"
        submensaje="Esto puede tomar unos segundos..."
      />
    </SafeAreaView>
  );
}

function KPICard({ icon, color, label, value, sub, isDark }: any) {
  return (
    <View style={[kpi.card, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
      <View style={[kpi.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[kpi.val, { color }]}>{value}</Text>
      <Text style={[kpi.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
      {sub ? <Text style={[kpi.sub, { color: isDark ? '#64748B' : '#94A3B8' }]}>{sub}</Text> : null}
    </View>
  );
}

const kpi = StyleSheet.create({
  card:     { width: (SCREEN_W - 72) / 2, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  val:      { fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  label:    { fontSize: 12, marginTop: 2, textAlign: 'center' },
  sub:      { fontSize: 10, marginTop: 1, textAlign: 'center' },
});

const s = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flexGrow: 1, padding: 16, paddingBottom: 40 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle:   { fontSize: 22, fontWeight: 'bold' },
  headerSub:     { fontSize: 13, marginTop: 2 },
  clearBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  clearTxt:      { fontSize: 12, fontWeight: '600' },
  scanBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginBottom: 10, gap: 8 },
  scanTxt:       { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  card:          { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: 'bold', marginBottom: 14 },
  label:         { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input:         { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  presetRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  presetChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  presetTxt:     { fontSize: 13, fontWeight: 'bold' },
  calcBtn:       { backgroundColor: '#0EA5E9', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  calcBtnTxt:    { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  kpiGrid:       { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  coberturaWrap: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
  progressBg:    { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', marginBottom: 2 },
  progressFill:  { height: 10, borderRadius: 5 },
  roiWrap:       { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
  roiBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  ctaRow:        { flexDirection: 'row', gap: 10, marginTop: 8 },
  ctaBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  ctaTxt:        { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  newQuoteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10, gap: 6 },
  newQuoteTxt:   { fontSize: 14, fontWeight: '600' },
  proBanner:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  proBannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' },
});
