// app/pro-calculator.tsx
import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, FlatList, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './_layout';
import * as DocumentPicker from 'expo-document-picker';
import { procesarDocumentoOCR, TipoConexion } from '../utils/ocrService';
import {
  obtenerHSPDesdeNasa,
  calcularProtecciones,
  sugerirInversorCompatible,
  calcularROIConHSP,
  generarComparativaOpciones,
} from '../utils/engineering';
import { PANELES_DB, INVERSORES_DB } from '../data/componentsDB';
import { useRouter } from 'expo-router';

const elegirInversorPorPotenciaYFases = (potenciaKW: number, fases: 1 | 3) => {
  const w = potenciaKW * 1000;
  const candidatos = INVERSORES_DB.filter(i => i.fases === fases && i.max_dc_input >= w);
  if (candidatos.length > 0)
    return candidatos.reduce((p, c) => c.max_dc_input < p.max_dc_input ? c : p);
  const fallback = INVERSORES_DB.filter(i => i.fases === fases);
  if (fallback.length > 0)
    return fallback.reduce((p, c) => c.max_dc_input > p.max_dc_input ? c : p);
  return INVERSORES_DB.reduce((p, c) => c.max_dc_input > p.max_dc_input ? c : p);
};

export default function ProCalculator() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();

  const [cliente, setCliente]       = useState('');
  const [consumo, setConsumo]       = useState('');
  const [hsp, setHsp]               = useState('');
  const [hspMeta, setHspMeta]       = useState<any>(null);
  const [panelSelId, setPanelSelId] = useState(PANELES_DB[0].id);
  const [tipoConexion, setTipoConexion] = useState<TipoConexion>({
    tarifa: 'Residencial', fases: 1,
    descripcion: 'Residencial — 220V bifásico L1-L2-N', voltajeAC: 220,
  });
  const [modalPaneles, setModalPaneles]       = useState(false);
  const [modalInversores, setModalInversores] = useState(false);
  const [modalFases, setModalFases]           = useState(false);
  const [inversoresCompatibles, setInversoresCompatibles] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);

  const panelSel = PANELES_DB.find(p => p.id === panelSelId) || PANELES_DB[0];

  const opcionesFases: TipoConexion[] = [
    { tarifa: 'Residencial', fases: 1, descripcion: 'Residencial / DAC — 220V bifásico L1-L2-N', voltajeAC: 220 },
    { tarifa: 'General BT',  fases: 1, descripcion: 'General BT monofásico — 220V L1-L2-N',      voltajeAC: 220 },
    { tarifa: 'General 3F',  fases: 3, descripcion: 'General BT trifásico — 220V L1-L2-L3-N',    voltajeAC: 380 },
    { tarifa: 'HM / MT',     fases: 3, descripcion: 'Media tensión industrial (HM/MT) — 380V 3F', voltajeAC: 380 },
  ];

  const escanearPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled) {
        Alert.alert('Analizando', 'Extrayendo datos del recibo...');
        const file = result.assets[0];
        const r = await procesarDocumentoOCR(file.uri, file.name, file.mimeType || 'application/pdf');
        if (r.exito) {
          if (r.consumo)  setConsumo(r.consumo);
          if (r.cliente)  setCliente(r.cliente);
          if (r.tipoConexion) {
            setTipoConexion(r.tipoConexion);
            Alert.alert(
              '✅ Recibo analizado',
              `Cliente: ${r.cliente || '(no detectado)'}\n` +
              `Consumo: ${r.consumo} kWh/mes\n` +
              `Tarifa CFE: ${r.tipoConexion.tarifa}\n` +
              `Suministro: ${r.tipoConexion.descripcion}\n\n` +
              `${r.mensaje || ''}`,
            );
          }
        } else Alert.alert('Error OCR', r.error);
      }
    } catch { Alert.alert('Error', 'Fallo al leer PDF.'); }
  };

  const obtenerHSP = async () => {
    const res = await obtenerHSPDesdeNasa();
    if (res.exito && res.hsp) {
      setHsp(res.hsp.toFixed(2));
      const meses = Object.entries(res.hspMensual || {})
        .filter(([k]) => k !== 'ANN')
        .map(([mes, val]) => ({ mes, valor: Number(val) }));
      const peor = meses.length ? meses.reduce((a, b) => a.valor < b.valor ? a : b) : null;
      const mejor = meses.length ? meses.reduce((a, b) => a.valor > b.valor ? a : b) : null;
      setHspMeta({
        ciudad: res.ciudad,
        lat: res.lat,
        lon: res.lon,
        anual: res.hsp,
        meses,
        peor,
        mejor,
      });
      Alert.alert(
        'HSP obtenido',
        `${res.hsp.toFixed(2)} h pico solar${res.ciudad ? `\n${res.ciudad}` : ''}`
      );
    } else Alert.alert('Error GPS', res.error);
  };

  const calcular = () => {
    const cons   = parseFloat(consumo);
    const hspNum = parseFloat(hsp);
    if (isNaN(cons) || isNaN(hspNum) || hspNum <= 0)
      return Alert.alert('Faltan datos', 'Completa consumo y HSP.');

    const panel       = panelSel;
    const eDiaria     = (cons / 30) * 1.20;
    const potArregloW = (eDiaria / hspNum) * 1000;
    const numPaneles  = Math.ceil(potArregloW / panel.pmax);
    const potenciaKW  = (numPaneles * panel.pmax) / 1000;

    const inversor     = elegirInversorPorPotenciaYFases(potenciaKW, tipoConexion.fases);
    const protecciones = calcularProtecciones(panel, inversor, numPaneles);
    const st           = protecciones.strings;

    const costoPaneles     = numPaneles * panel.precio_mxn;
    const costoInversor    = inversor.precio_mxn;
    const costoInstalacion = Math.round(potenciaKW * 1000 * 8);
    const costoTotal       = costoPaneles + costoInversor + costoInstalacion;

    const roi = calcularROIConHSP(cons, costoTotal, tipoConexion.tarifa, potenciaKW, hspNum);

    let compatibles: any[] = [];
    if (st.errores.length > 0) {
      compatibles = sugerirInversorCompatible(panel, numPaneles, INVERSORES_DB, potenciaKW)
        .filter((inv: any) => inv.fases === tipoConexion.fases);
      setInversoresCompatibles(compatibles);
    } else {
      setInversoresCompatibles([]);
    }

    const comparativa = generarComparativaOpciones(cons, tipoConexion.tarifa, tipoConexion.fases, hspNum, panel);

    setResultados({
      numPaneles, potenciaKW, inversor, protecciones,
      panelObj: panel, costoPaneles, costoInversor,
      costoInstalacion, costoTotal, tipoConexion,
      hayErrores: st.errores.length > 0,
      compatibles,
      roi,
      comparativa,
      hspMeta,
    });
  };

  const cambiarAInversor = (nuevoInversor: any) => {
    setModalInversores(false);
    if (!resultados) return;
    const panel        = resultados.panelObj;
    const numPaneles   = resultados.numPaneles;
    const protecciones = calcularProtecciones(panel, nuevoInversor, numPaneles);
    const costoPaneles     = numPaneles * panel.precio_mxn;
    const costoInversor    = nuevoInversor.precio_mxn;
    const costoInstalacion = Math.round(resultados.potenciaKW * 1000 * 8);
    const costoTotal       = costoPaneles + costoInversor + costoInstalacion;
    const roi = calcularROIConHSP(
      parseFloat(consumo),
      costoTotal,
      resultados.tipoConexion.tarifa,
      resultados.potenciaKW,
      parseFloat(hsp || '4.5')
    );
    setResultados({
      ...resultados, inversor: nuevoInversor, protecciones, costoInversor,
      costoTotal,
      hayErrores: protecciones.strings.errores.length > 0,
      compatibles: [],
      roi,
    });
    setInversoresCompatibles([]);
  };

  const enviarACotizacion = () => {
    if (!resultados) return Alert.alert('Calcula primero');
    const nc = cliente.trim() || 'Cliente';
    const items = JSON.stringify([
      { id:'1', descripcion:`Panel ${resultados.panelObj.marca} ${resultados.panelObj.modelo}`, cantidad: String(resultados.numPaneles), precio: String(resultados.panelObj.precio_mxn) },
      { id:'2', descripcion:`Inversor ${resultados.inversor.marca} ${resultados.inversor.modelo}`, cantidad:'1', precio: String(resultados.inversor.precio_mxn) },
      { id:'3', descripcion:`Instalación ${resultados.potenciaKW.toFixed(2)} kWp`, cantidad:'1', precio: String(resultados.costoInstalacion) },
    ]);
    router.push({
      pathname: '/quotes',
      params: {
        clienteParam: nc,
        itemsParam:   items,
        roiParam:     JSON.stringify(resultados.roi),
      },
    });
  };

  const cotizarOpcion = (op: any) => {
    const nc = cliente.trim() || 'Cliente';
    const items = JSON.stringify([
      { id:'1', descripcion:`Panel ${op.panel.marca} ${op.panel.modelo}`, cantidad: String(op.numPaneles), precio: String(op.panel.precio_mxn) },
      { id:'2', descripcion:`Inversor ${op.inversor.marca} ${op.inversor.modelo}`, cantidad:'1', precio: String(op.inversor.precio_mxn) },
      { id:'3', descripcion:`Instalación ${op.potenciaKWp.toFixed(2)} kWp`, cantidad:'1', precio: String(op.costoInstalacion) },
    ]);
    router.push({
      pathname: '/quotes',
      params: {
        clienteParam: nc,
        itemsParam:   items,
        roiParam:     JSON.stringify(op.roi),
      },
    });
  };

  const d = {
    bg:    { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
    text:  { color: isDark ? '#F1F5F9' : '#0F172A' },
    sub:   { color: isDark ? '#94A3B8' : '#64748B' },
    input: { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: isDark ? '#F8FAFC' : '#000' },
    card:  { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
    modal: { backgroundColor: isDark ? '#1E293B' : '#FFF' },
  };

  const st = resultados?.protecciones?.strings;
  const hspNivel = (v: number) => v < 4 ? { txt:'Bajo', color:'#EF4444' } : v < 5.5 ? { txt:'Bueno', color:'#F59E0B' } : { txt:'Excelente', color:'#10B981' };
  const nivel = hspMeta?.anual ? hspNivel(hspMeta.anual) : null;

  return (
    <SafeAreaView style={[{ flex:1 }, d.bg]} edges={['top','left','right']}>
      <ScrollView style={d.bg}>
        <View style={s.container}>
          <Text style={[s.title, d.text]}>Dimensionamiento Profesional</Text>

          <View style={s.row2}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor:'#8B5CF6' }]} onPress={escanearPDF}>
              <Ionicons name="document-text" size={20} color="#FFF" />
              <Text style={s.btnTxt}>Recibo PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor:'#F59E0B' }]} onPress={obtenerHSP}>
              <Ionicons name="radio-outline" size={20} color="#FFF" />
              <Text style={s.btnTxt}>HSP NASA</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.card, d.card]}>
            <TextInput style={[s.input, d.input, { marginBottom:10 }]}
              placeholder="Cliente / Dirección" placeholderTextColor={isDark?'#64748B':'#94A3B8'}
              value={cliente} onChangeText={setCliente} />
            <View style={s.row2}>
              <TextInput style={[s.input, d.input, { width:'48%' }]}
                placeholder="Consumo mensual kWh" keyboardType="numeric"
                placeholderTextColor={isDark?'#64748B':'#94A3B8'}
                value={consumo} onChangeText={setConsumo} />
              <TextInput style={[s.input, d.input, { width:'48%' }]}
                placeholder="HSP" keyboardType="numeric"
                placeholderTextColor={isDark?'#64748B':'#94A3B8'}
                value={hsp} onChangeText={setHsp} />
            </View>

            {hspMeta && (
              <View style={[s.hspCard, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View style={{ flex:1 }}>
                    <Text style={[d.text, { fontWeight:'bold', fontSize:14 }]}>Radiación solar por ubicación</Text>
                    <Text style={[d.sub, { fontSize:12, marginTop:2 }]}>{hspMeta.ciudad || `${hspMeta.lat.toFixed(4)}, ${hspMeta.lon.toFixed(4)}`}</Text>
                  </View>
                  {nivel && (
                    <View style={[s.badgePill, { backgroundColor: `${nivel.color}22` }]}>
                      <Text style={{ color:nivel.color, fontWeight:'bold', fontSize:11 }}>{nivel.txt}</Text>
                    </View>
                  )}
                </View>
                <View style={s.hspStatsRow}>
                  <MiniStat label="HSP anual" val={hspMeta.anual.toFixed(2)} color="#F59E0B" />
                  <MiniStat label="Mejor mes" val={hspMeta.mejor ? `${hspMeta.mejor.mes} ${hspMeta.mejor.valor.toFixed(2)}` : '-'} color="#10B981" />
                  <MiniStat label="Peor mes" val={hspMeta.peor ? `${hspMeta.peor.mes} ${hspMeta.peor.valor.toFixed(2)}` : '-'} color="#EF4444" />
                </View>
              </View>
            )}

            <Text style={[s.label, d.text, { marginTop:8 }]}>Tipo de suministro eléctrico:</Text>
            <TouchableOpacity style={[s.selector, d.card, {
              borderColor: tipoConexion.fases === 3 ? '#F59E0B' : '#10B981'
            }]} onPress={() => setModalFases(true)}>
              <Ionicons name={tipoConexion.fases === 3 ? 'flash' : 'home'} size={22}
                color={tipoConexion.fases === 3 ? '#F59E0B' : '#10B981'} />
              <View style={{ flex:1, marginLeft:10 }}>
                <Text style={[d.text, { fontWeight:'bold', fontSize:14 }]}>
                  {tipoConexion.fases === 1 ? 'Monofásico' : 'Trifásico'} — {tipoConexion.voltajeAC}V
                  {tipoConexion.tarifa ? `  ·  Tarifa ${tipoConexion.tarifa}` : ''}
                </Text>
                <Text style={[d.sub, { fontSize:12 }]}>{tipoConexion.descripcion}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={isDark?'#94A3B8':'#64748B'} />
            </TouchableOpacity>

            <Text style={[s.label, d.text, { marginTop:8 }]}>Panel Solar:</Text>
            <TouchableOpacity style={[s.selector, d.card]} onPress={() => setModalPaneles(true)}>
              <View style={{ flex:1 }}>
                <Text style={[d.text, { fontWeight:'bold', fontSize:15 }]}>{panelSel.marca} {panelSel.modelo}</Text>
                <Text style={[d.sub, { fontSize:12 }]}>{panelSel.pmax}W  •  Voc {panelSel.voc}V  •  Isc {panelSel.isc}A</Text>
              </View>
              <Ionicons name="chevron-down" size={22} color={isDark?'#94A3B8':'#64748B'} />
            </TouchableOpacity>

            <TouchableOpacity style={s.calcBtn} onPress={calcular}>
              <Text style={{ color:'#FFF', fontWeight:'bold', fontSize:16 }}>Ejecutar Ingeniería</Text>
            </TouchableOpacity>
          </View>

          {resultados && st && (
            <View style={[s.card, d.card, { marginTop:20 }]}>
              <Text style={[s.title, { color:'#10B981' }]}>Memoria de Cálculo</Text>
              <Text style={[s.normaNote, d.sub]}>NOM-001-SEDE-2012 Art.690 / NMX-J-680-ANCE-2014</Text>

              <View style={[s.conexionBadge, {
                borderColor: resultados.tipoConexion.fases === 3 ? '#F59E0B' : '#10B981',
                backgroundColor: resultados.tipoConexion.fases === 3 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'
              }]}>
                <Ionicons name={resultados.tipoConexion.fases === 3 ? 'flash' : 'home'} size={18}
                  color={resultados.tipoConexion.fases === 3 ? '#F59E0B' : '#10B981'} />
                <View style={{ marginLeft:8 }}>
                  <Text style={[d.text, { fontWeight:'bold', fontSize:13 }]}>
                    Suministro: {resultados.tipoConexion.fases === 1 ? 'Monofásico' : 'Trifásico'} — Tarifa {resultados.tipoConexion.tarifa}
                  </Text>
                  <Text style={[d.sub, { fontSize:12 }]}>{resultados.tipoConexion.descripcion}</Text>
                </View>
              </View>

              <Text style={[s.secLabel, d.text]}>Arreglo FV</Text>
              <View style={s.chips}>
                <Chip icon="sunny"            color="#F59E0B" num={String(resultados.numPaneles)}    label="Paneles" />
                <Chip icon="flash"            color="#0EA5E9" num={resultados.potenciaKW.toFixed(2)} label="kWp" />
                <Chip icon="battery-charging" color="#10B981" num={`${resultados.panelObj.pmax}W`}  label="c/panel" />
              </View>
              <Text style={[d.sub, { fontSize:13, marginBottom:8 }]}>{resultados.panelObj.marca} {resultados.panelObj.modelo}</Text>

              <Divider />

              <Text style={[s.secLabel, d.text]}>Arreglo de Strings (NOM-001 Art.690.7)</Text>
              <View style={s.stringDiagram}>
                <StringBox num={st.panelesPorString}  label={`Paneles/String\n(serie)`} />
                <Text style={[s.op, d.sub]}>×</Text>
                <StringBox num={st.stringsEnParalelo} label={`Strings/MPPT\n(paralelo)`} />
                <Text style={[s.op, d.sub]}>×</Text>
                <StringBox num={st.mpptUsados}        label={`MPPT\nde ${resultados.inversor.num_mppt}`} />
              </View>

              {st.distribucionMPPT.length > 1 && (
                <View style={[s.mpptDist, { borderColor: isDark?'#334155':'#E2E8F0' }]}>
                  <Text style={[s.mpptDistTitle, d.sub]}>Distribución por MPPT:</Text>
                  {st.distribucionMPPT.map((m: any) => (
                    <Text key={m.mppt} style={[d.sub, { fontSize:13 }]}>
                      {'  '}MPPT {m.mppt}: {m.strings} string{m.strings>1?'s':''} × {st.panelesPorString} paneles = {m.paneles} paneles
                    </Text>
                  ))}
                </View>
              )}

              <View style={[s.tabla, { borderColor: isDark?'#334155':'#E2E8F0' }]}>
                <TablaFila label="Voc string (STC 25°C)"           val={`${st.vocStringStc} V`}           badge="ref"    badgeColor="#64748B" />
                <TablaFila label="Voc string invierno (-10°C)"     val={`${st.vocStringInvierno} V`}       badge={st.vocDentroLimite ? '✓ OK' : '✗ FALLA'} badgeColor={st.vocDentroLimite ? '#10B981' : '#EF4444'} />
                <TablaFila label="Vmp string (trabajo MPPT)"       val={`${st.vmpString} V`}              badge="MPPT"   badgeColor="#0EA5E9" />
                <TablaFila label="Isc de 1 string (STC)"           val={`${st.iscString} A`}              badge="ref"    badgeColor="#64748B" />
                <TablaFila label={`Isc entrada MPPT (${st.stringsEnParalelo} str × ${st.iscString}A)`}  val={`${st.corrienteEntradaMPPT} A`} badge={st.iscDentroLimite ? '✓ OK' : '✗ FALLA'} badgeColor={st.iscDentroLimite ? '#10B981' : '#EF4444'} />
                <TablaFila label={`Límite MPPT — ${resultados.inversor.marca} ${resultados.inversor.modelo}`} val={`${resultados.inversor.imax_por_mppt} A`} badge="max" badgeColor="#94A3B8" />
                <TablaFila label="Isc diseño fusible (Isc×1.56, NOM 690.8)" val={`${st.iDisenoFusibleStr} A`} badge="fusible" badgeColor="#8B5CF6" last />
              </View>

              {st.errores.length > 0 && (
                <View style={s.errorBox}>
                  <Text style={s.errorTitle}>Violación de Norma</Text>
                  {st.errores.map((e: string, i: number) => <Text key={i} style={s.errorTxt}>{e}</Text>)}
                  {resultados.compatibles.length > 0 && (
                    <TouchableOpacity style={s.cambiarBtn} onPress={() => setModalInversores(true)}>
                      <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                      <Text style={s.cambiarBtnTxt}>
                        Ver inversores {resultados.tipoConexion.fases === 1 ? 'monofásicos' : 'trifásicos'} compatibles ({resultados.compatibles.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                  {resultados.compatibles.length === 0 && (
                    <Text style={[s.errorTxt, { marginTop:4 }]}>No hay inversor compatible en la base de datos.</Text>
                  )}
                </View>
              )}

              {st.alertas.length > 0 && (
                <View style={s.alertBox}>
                  {st.alertas.map((a: string, i: number) => <Text key={i} style={s.alertTxt}>{a}</Text>)}
                </View>
              )}

              <Divider />

              <Text style={[s.secLabel, d.text]}>Inversor Sugerido</Text>
              <View style={[s.inversorCard, { borderColor: resultados.hayErrores ? '#EF4444' : '#10B981' }]}>
                <View style={{ flex:1 }}>
                  <Text style={[d.text, { fontWeight:'bold', fontSize:15 }]}>{resultados.inversor.marca} {resultados.inversor.modelo}</Text>
                  <Text style={d.sub}>{resultados.inversor.fases === 1 ? 'Monofásico' : 'Trifásico'} {resultados.inversor.v_ac}V{'  •  '}{resultados.inversor.num_mppt} MPPT  •  {resultados.inversor.imax_por_mppt}A/MPPT</Text>
                  <Text style={d.sub}>DC max: {(resultados.inversor.max_dc_input/1000).toFixed(1)} kW  •  Vmax: {resultados.inversor.max_dc_volts}V</Text>
                  <Text style={[{ color: resultados.hayErrores ? '#EF4444' : '#10B981', marginTop:4, fontWeight:'bold', fontSize:12 }]}>
                    {resultados.hayErrores ? 'No cumple NOM — cambiar inversor' : 'Cumple NOM-001 / NMX-J-680'}
                  </Text>
                </View>
                <Ionicons name="hardware-chip" size={36} color={resultados.hayErrores?'#EF4444':'#10B981'} />
              </View>

              <Divider />

              <Text style={[s.secLabel, d.text]}>Protecciones CC (por string)</Text>
              <Text style={d.sub}>  Isc diseño: {resultados.protecciones.iDisenoCC}A  (Isc × 1.56)</Text>
              <Text style={d.sub}>  Fusible: {resultados.protecciones.fusibleCC}A</Text>
              <Text style={d.sub}>  Conductor: {resultados.protecciones.cableCC}</Text>
              <Text style={[s.secLabel, d.text, { marginTop:12 }]}>Protecciones CA</Text>
              <Text style={d.sub}>  Iac diseño: {resultados.protecciones.iDisenoCA}A  (Iac × 1.25)</Text>
              <Text style={d.sub}>  Termomag: {resultados.protecciones.pastillaCA}A</Text>
              <Text style={d.sub}>  Conductor: {resultados.protecciones.cableCA}</Text>

              <Divider />

              <Text style={[s.secLabel, d.text]}>Estimado de Costos</Text>
              <CostoFila label={`Paneles (${resultados.numPaneles} × $${resultados.panelObj.precio_mxn.toLocaleString()})`} val={`$${resultados.costoPaneles.toLocaleString()}`} d={d} />
              <CostoFila label="Inversor"                val={`$${resultados.costoInversor.toLocaleString()}`}    d={d} />
              <CostoFila label="Instalación y materiales" val={`$${resultados.costoInstalacion.toLocaleString()}`} d={d} />
              <View style={[s.totalRow, { borderColor:'#CBD5E1' }]}>
                <Text style={[d.text, { fontWeight:'bold', fontSize:16 }]}>TOTAL ESTIMADO</Text>
                <Text style={{ fontWeight:'bold', fontSize:18, color:'#10B981' }}>${resultados.costoTotal.toLocaleString()}</Text>
              </View>

              {resultados.roi && (
                <View style={[s.roiPreview, { borderColor: isDark?'#334155':'#E2E8F0' }]}>
                  <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
                    <Ionicons name="trending-up" size={20} color="#10B981" />
                    <Text style={[d.text, { fontWeight:'bold', fontSize:14, marginLeft:6 }]}>Retorno de Inversión</Text>
                  </View>
                  <Text style={[d.sub, { fontSize:12, marginBottom:10 }]}>Calculado con HSP real: {resultados.roi.hspUsado?.toFixed?.(2) || hsp} hsp</Text>
                  <View style={s.roiRow}>
                    <View style={s.roiChip}>
                      <Text style={[d.sub, { fontSize:11 }]}>Ahorro/bimestre</Text>
                      <Text style={{ fontSize:16, fontWeight:'bold', color:'#10B981' }}>${resultados.roi.ahorroBimestral.toLocaleString()}</Text>
                    </View>
                    <View style={s.roiChip}>
                      <Text style={[d.sub, { fontSize:11 }]}>Recuperación</Text>
                      <Text style={{ fontSize:16, fontWeight:'bold', color:'#0EA5E9' }}>{resultados.roi.roiMeses} meses</Text>
                    </View>
                    <View style={s.roiChip}>
                      <Text style={[d.sub, { fontSize:11 }]}>Ganancia 25 años</Text>
                      <Text style={{ fontSize:14, fontWeight:'bold', color:'#F59E0B' }}>${Math.round(resultados.roi.gananciaTotal25/1000)}k</Text>
                    </View>
                  </View>
                </View>
              )}

              {resultados.comparativa?.length > 0 && (
                <>
                  <Divider />
                  <Text style={[s.secLabel, d.text]}>Comparador de Opciones</Text>
                  <Text style={[d.sub, { fontSize:12, marginBottom:10 }]}>Mismo consumo y misma ubicación solar, con distintas configuraciones del sistema.</Text>
                  {resultados.comparativa.map((op: any) => (
                    <View key={op.id} style={[s.optionCard, { borderColor: op.color }] }>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                        <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
                          <Ionicons name={op.icono} size={20} color={op.color} />
                          <Text style={[d.text, { fontWeight:'bold', fontSize:15, marginLeft:8 }]}>{op.etiqueta}</Text>
                        </View>
                        <View style={[s.badgePill, { backgroundColor: op.cumpleNorm ? '#10B98122' : '#EF444422' }]}>
                          <Text style={{ color: op.cumpleNorm ? '#10B981' : '#EF4444', fontWeight:'bold', fontSize:11 }}>
                            {op.cumpleNorm ? 'NOM OK' : 'Revisar'}
                          </Text>
                        </View>
                      </View>

                      <View style={s.optionGrid}>
                        <MiniStat label="Total" val={`$${Math.round(op.costoTotal/1000)}k`} color={op.color} />
                        <MiniStat label="Potencia" val={`${op.potenciaKWp.toFixed(2)} kWp`} color="#0EA5E9" />
                        <MiniStat label="ROI" val={`${op.roi.roiMeses} meses`} color="#10B981" />
                      </View>

                      <Text style={[d.sub, { fontSize:12 }]}>• {op.numPaneles} paneles {op.panel.marca} {op.panel.modelo}</Text>
                      <Text style={[d.sub, { fontSize:12 }]}>• Inversor {op.inversor.marca} {op.inversor.modelo}</Text>
                      <Text style={[d.sub, { fontSize:12, marginBottom:10 }]}>• Ahorro anual estimado: ${op.roi.ahorroAnual.toLocaleString()}</Text>

                      <TouchableOpacity style={[s.quoteOptionBtn, { backgroundColor: op.color }]} onPress={() => cotizarOpcion(op)}>
                        <Ionicons name="document-text-outline" size={18} color="#FFF" />
                        <Text style={s.quoteOptionTxt}>Cotizar esta opción</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={[s.calcBtn, { backgroundColor:'#0EA5E9', marginTop:20 }]} onPress={enviarACotizacion}>
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <Text style={{ color:'#FFF', fontWeight:'bold', marginLeft:8, fontSize:15 }}>Preparar Cotización</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalPaneles} animationType="slide" transparent onRequestClose={() => setModalPaneles(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, d.modal]}>
            <ModalHeader title="Seleccionar Panel" onClose={() => setModalPaneles(false)} d={d} />
            <FlatList data={PANELES_DB} keyExtractor={i => i.id} contentContainerStyle={{ paddingBottom:20 }}
              renderItem={({ item }) => {
                const sel = item.id === panelSelId;
                return (
                  <TouchableOpacity style={[s.listItem, {
                    borderColor: sel ? '#0EA5E9' : (isDark?'#334155':'#E2E8F0'),
                    backgroundColor: sel ? 'rgba(14,165,233,0.1)' : (isDark?'#0F172A':'#F8FAFC')
                  }]} onPress={() => { setPanelSelId(item.id); setModalPaneles(false); }}>
                    <View style={{ flex:1 }}>
                      <Text style={[d.text, { fontWeight:'bold', fontSize:15 }]}>{item.marca}</Text>
                      <Text style={d.sub}>{item.modelo}</Text>
                      <Text style={[d.sub, { fontSize:11 }]}>Isc {item.isc}A  •  Voc {item.voc}V</Text>
                    </View>
                    <View style={{ alignItems:'center', marginLeft:8 }}>
                      <Text style={{ fontSize:22, fontWeight:'bold', color:'#0EA5E9' }}>{item.pmax}</Text>
                      <Text style={{ fontSize:11, color:'#64748B' }}>W</Text>
                    </View>
                    {sel && <Ionicons name="checkmark-circle" size={24} color="#0EA5E9" style={{ marginLeft:8 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={modalFases} animationType="slide" transparent onRequestClose={() => setModalFases(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, d.modal]}>
            <ModalHeader title="Tipo de Suministro Eléctrico" onClose={() => setModalFases(false)} d={d} />
            <Text style={[{ fontSize:13, marginBottom:12, color:'#64748B' }]}>Detectado automáticamente del recibo CFE. Puedes cambiarlo si es necesario.</Text>
            {opcionesFases.map((op, idx) => (
              <TouchableOpacity key={idx} style={[s.listItem, {
                borderColor: tipoConexion.tarifa === op.tarifa ? '#10B981' : (isDark?'#334155':'#E2E8F0'),
                backgroundColor: tipoConexion.tarifa === op.tarifa ? 'rgba(16,185,129,0.08)' : (isDark?'#0F172A':'#F8FAFC')
              }]} onPress={() => { setTipoConexion(op); setModalFases(false); }}>
                <Ionicons name={op.fases === 1 ? 'home' : 'flash'} size={22}
                  color={op.fases === 1 ? '#10B981' : '#F59E0B'} style={{ marginRight:12 }} />
                <View style={{ flex:1 }}>
                  <Text style={[d.text, { fontWeight:'bold' }]}>{op.fases === 1 ? 'Monofásico' : 'Trifásico'} {op.voltajeAC}V</Text>
                  <Text style={d.sub}>{op.descripcion}</Text>
                </View>
                {tipoConexion.tarifa === op.tarifa && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={modalInversores} animationType="slide" transparent onRequestClose={() => setModalInversores(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, d.modal]}>
            <ModalHeader title="Inversores Compatibles" onClose={() => setModalInversores(false)} d={d} />
            <Text style={[{ fontSize:13, marginBottom:12, color:'#64748B' }]}>
              {resultados?.tipoConexion.fases === 1 ? 'Monofásicos' : 'Trifásicos'} que cumplen NOM-001-SEDE-2012
            </Text>
            <FlatList data={inversoresCompatibles} keyExtractor={i => i.id} contentContainerStyle={{ paddingBottom:20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.listItem, { borderColor:'#10B981', backgroundColor: isDark?'rgba(16,185,129,0.06)':'rgba(16,185,129,0.04)' }]}
                  onPress={() => cambiarAInversor(item)}>
                  <View style={{ flex:1 }}>
                    <Text style={[d.text, { fontWeight:'bold', fontSize:15 }]}>{item.marca} {item.modelo}</Text>
                    <Text style={d.sub}>{item.fases === 1 ? 'Monofásico' : 'Trifásico'} {item.v_ac}V{'  •  '}{item.num_mppt} MPPT  •  {item.imax_por_mppt}A/MPPT  •  Vmax {item.max_dc_volts}V</Text>
                  </View>
                  <View style={{ alignItems:'center' }}>
                    <Text style={{ fontSize:13, fontWeight:'bold', color:'#10B981' }}>${item.precio_mxn.toLocaleString()}</Text>
                    <Text style={{ fontSize:11, color:'#64748B' }}>MXN</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Divider = () => <View style={{ height:1, backgroundColor:'#CBD5E1', marginVertical:14 }} />;
const Chip = ({ icon, color, num, label }: any) => (
  <View style={s.chip}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[s.chipNum, { color }]}>{num}</Text>
    <Text style={s.chipLabel}>{label}</Text>
  </View>
);
const StringBox = ({ num, label }: any) => (
  <View style={s.strBox}>
    <Text style={s.strNum}>{num}</Text>
    <Text style={s.strLabel}>{label}</Text>
  </View>
);
const TablaFila = ({ label, val, badge, badgeColor, last }: any) => (
  <View style={[s.tabFila, last ? {} : { borderBottomWidth:1, borderBottomColor:'#E2E8F0' }]}>
    <Text style={[s.tabKey, { color:'#64748B' }]}>{label}</Text>
    <Text style={[s.tabVal, { color:'#0F172A' }]}>{val}</Text>
    <View style={[s.badge, { backgroundColor: badgeColor+'22' }]}>
      <Text style={[s.badgeTxt, { color: badgeColor }]}>{badge}</Text>
    </View>
  </View>
);
const CostoFila = ({ label, val, d }: any) => (
  <View style={s.costoFila}>
    <Text style={[d.sub, { flex:2 }]}>{label}</Text>
    <Text style={[d.text, { fontWeight:'bold' }]}>{val}</Text>
  </View>
);
const ModalHeader = ({ title, onClose, d }: any) => (
  <View style={s.modalHeader}>
    <Text style={[s.title, d.text, { marginBottom:0 }]}>{title}</Text>
    <TouchableOpacity onPress={onClose}>
      <Ionicons name="close-circle" size={28} color="#94A3B8" />
    </TouchableOpacity>
  </View>
);
const MiniStat = ({ label, val, color }: any) => (
  <View style={s.miniStat}>
    <Text style={[s.miniVal, { color }]}>{val}</Text>
    <Text style={s.miniLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container:     { padding:20, paddingBottom:50 },
  title:         { fontSize:20, fontWeight:'bold', marginBottom:12 },
  normaNote:     { fontSize:11, marginBottom:14, fontStyle:'italic' },
  secLabel:      { fontSize:15, fontWeight:'bold', marginBottom:8 },
  label:         { fontSize:14, fontWeight:'bold', marginBottom:5 },
  row2:          { flexDirection:'row', justifyContent:'space-between', marginBottom:16 },
  actionBtn:     { width:'48%', flexDirection:'row', padding:12, borderRadius:8, justifyContent:'center', alignItems:'center' },
  btnTxt:        { color:'#FFF', fontWeight:'bold', marginLeft:8 },
  card:          { padding:20, borderRadius:12, borderWidth:1 },
  input:         { borderWidth:1, borderRadius:8, padding:12, fontSize:16 },
  selector:      { flexDirection:'row', alignItems:'center', padding:14, borderRadius:10, borderWidth:1.5, marginBottom:15 },
  calcBtn:       { backgroundColor:'#10B981', padding:16, borderRadius:8, alignItems:'center', marginTop:10, flexDirection:'row', justifyContent:'center' },
  conexionBadge: { flexDirection:'row', alignItems:'center', padding:12, borderRadius:8, borderWidth:1, marginBottom:14 },
  hspCard:       { borderWidth:1, borderRadius:10, padding:12, marginBottom:14, backgroundColor:'rgba(245,158,11,0.05)' },
  hspStatsRow:   { flexDirection:'row', justifyContent:'space-between', marginTop:10 },
  badgePill:     { paddingHorizontal:8, paddingVertical:4, borderRadius:999 },
  chips:         { flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  chip:          { flex:1, alignItems:'center', backgroundColor:'rgba(14,165,233,0.08)', borderRadius:10, padding:10, marginHorizontal:3 },
  chipNum:       { fontSize:18, fontWeight:'bold', marginTop:3 },
  chipLabel:     { fontSize:11, color:'#64748B', marginTop:2 },
  stringDiagram: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:12 },
  strBox:        { alignItems:'center', backgroundColor:'rgba(14,165,233,0.08)', borderRadius:10, padding:12, minWidth:78 },
  strNum:        { fontSize:26, fontWeight:'bold', color:'#0EA5E9' },
  strLabel:      { fontSize:10, color:'#64748B', textAlign:'center', marginTop:3, lineHeight:15 },
  op:            { fontSize:22, fontWeight:'bold', marginHorizontal:6 },
  mpptDist:      { borderWidth:1, borderRadius:8, padding:10, marginBottom:10 },
  mpptDistTitle: { fontSize:12, marginBottom:6 },
  tabla:         { borderWidth:1, borderRadius:8, overflow:'hidden', marginBottom:10 },
  tabFila:       { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:8 },
  tabKey:        { flex:3, fontSize:12 },
  tabVal:        { flex:2, fontSize:13, fontWeight:'bold', textAlign:'right' },
  badge:         { marginLeft:8, paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  badgeTxt:      { fontSize:11, fontWeight:'bold' },
  errorBox:      { backgroundColor:'rgba(239,68,68,0.08)', borderWidth:1, borderColor:'#EF4444', borderRadius:8, padding:12, marginBottom:10 },
  errorTitle:    { color:'#EF4444', fontWeight:'bold', fontSize:14, marginBottom:6 },
  errorTxt:      { color:'#EF4444', fontSize:13, marginBottom:2 },
  cambiarBtn:    { flexDirection:'row', alignItems:'center', backgroundColor:'#EF4444', padding:10, borderRadius:8, marginTop:10, justifyContent:'center' },
  cambiarBtnTxt: { color:'#FFF', fontWeight:'bold', marginLeft:8, fontSize:13 },
  alertBox:      { backgroundColor:'rgba(245,158,11,0.08)', borderWidth:1, borderColor:'#F59E0B', borderRadius:8, padding:12, marginBottom:10 },
  alertTxt:      { color:'#D97706', fontSize:13, marginBottom:2 },
  inversorCard:  { flexDirection:'row', alignItems:'center', borderWidth:2, borderRadius:10, padding:14, marginBottom:8 },
  costoFila:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  totalRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth:1, marginTop:6, paddingTop:8 },
  roiPreview:    { borderWidth:1, borderRadius:10, padding:14, marginTop:14 },
  roiRow:        { flexDirection:'row', justifyContent:'space-between' },
  roiChip:       { flex:1, alignItems:'center', marginHorizontal:3 },
  miniStat:      { flex:1, alignItems:'center', padding:6 },
  miniVal:       { fontSize:14, fontWeight:'bold', textAlign:'center' },
  miniLabel:     { fontSize:11, color:'#64748B', textAlign:'center', marginTop:2 },
  optionCard:    { borderWidth:1.5, borderRadius:12, padding:14, marginBottom:12, backgroundColor:'rgba(255,255,255,0.02)' },
  optionGrid:    { flexDirection:'row', justifyContent:'space-between', marginTop:10, marginBottom:10 },
  quoteOptionBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', padding:12, borderRadius:8, marginTop:4 },
  quoteOptionTxt:{ color:'#FFF', fontWeight:'bold', marginLeft:8 },
  modalOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalBox:      { borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, maxHeight:'82%' },
  modalHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  listItem:      { flexDirection:'row', alignItems:'center', padding:14, borderRadius:10, borderWidth:1.5, marginBottom:10 },
});
