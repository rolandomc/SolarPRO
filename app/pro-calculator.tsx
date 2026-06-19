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

const PRECIO_KWH_POR_TARIFA: Record<string, number> = {
  'Residencial': 2.85,
  'DAC':         2.85,
  '1':           1.80,
  '1A':          1.80,
  'General BT':  3.20,
  '2':           3.20,
  '3':           2.50,
  'General 3F':  2.50,
  'HM':          1.80,
  'HM / MT':     1.80,
  'OM':          2.10,
  'MT':          1.80,
};

const calcularROI = (
  consumoMensualKwh: number,
  costoTotal: number,
  tarifa: string,
  potenciaKWp: number,
) => {
  const precioKwh = PRECIO_KWH_POR_TARIFA[tarifa] ?? 2.85;
  const kwGeneradosMes   = potenciaKWp * 4.5 * 30 * 0.80;
  const kwhAhorroDirecto = Math.min(consumoMensualKwh, kwGeneradosMes);

  const ahorroMensual    = Math.round(kwhAhorroDirecto * precioKwh);
  const ahorroBimestral  = ahorroMensual * 2;
  const ahorroAnual      = ahorroMensual * 12;
  const roiMeses         = Math.round(costoTotal / ahorroMensual);
  const roiAnos          = (roiMeses / 12).toFixed(1);
  const ahorroTotal25    = ahorroAnual * 25;
  const gananciaTotal25  = ahorroTotal25 - costoTotal;

  return {
    potenciaKWp,
    precioKwh,
    kwGeneradosMes:   Math.round(kwGeneradosMes),
    ahorroMensual,
    ahorroBimestral,
    ahorroAnual,
    roiMeses,
    roiAnos,
    ahorroTotal25,
    gananciaTotal25,
    tarifa,
  };
};

export default function ProCalculator() {
  const { isDark } = useContext(ThemeContext);
  const router = useRouter();

  const [cliente, setCliente]       = useState('');
  const [consumo, setConsumo]       = useState('');
  const [hsp, setHsp]               = useState('');
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
      Alert.alert('HSP obtenido', `${res.hsp.toFixed(2)} h pico solar`);
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

    const roi = calcularROI(cons, costoTotal, tipoConexion.tarifa, potenciaKW);

    let compatibles: any[] = [];
    if (st.errores.length > 0) {
      compatibles = sugerirInversorCompatible(panel, numPaneles, INVERSORES_DB, potenciaKW)
        .filter((inv: any) => inv.fases === tipoConexion.fases);
      setInversoresCompatibles(compatibles);
    } else {
      setInversoresCompatibles([]);
    }

    setResultados({
      numPaneles, potenciaKW, inversor, protecciones,
      panelObj: panel, costoPaneles, costoInversor,
      costoInstalacion, costoTotal, tipoConexion,
      hayErrores: st.errores.length > 0,
      compatibles,
      roi,
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
    const roi              = calcularROI(parseFloat(consumo), costoTotal, resultados.tipoConexion.tarifa, resultados.potenciaKW);
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

    const ingData = JSON.stringify({
      numPaneles: resultados.numPaneles,
      potenciaKW: resultados.potenciaKW,
      panel: {
        marca: resultados.panelObj.marca,
        modelo: resultados.panelObj.modelo,
        pmax: resultados.panelObj.pmax,
        voc: resultados.panelObj.voc,
        isc: resultados.panelObj.isc,
      },
      inversor: {
        marca: resultados.inversor.marca,
        modelo: resultados.inversor.modelo,
        fases: resultados.inversor.fases,
        v_ac: resultados.inversor.v_ac,
        num_mppt: resultados.inversor.num_mppt,
        imax_por_mppt: resultados.inversor.imax_por_mppt,
        max_dc_input: resultados.inversor.max_dc_input,
        max_dc_volts: resultados.inversor.max_dc_volts,
      },
      protecciones: {
        iDisenoCC: resultados.protecciones.iDisenoCC,
        fusibleCC: resultados.protecciones.fusibleCC,
        cableCC: resultados.protecciones.cableCC,
        iDisenoCA: resultados.protecciones.iDisenoCA,
        pastillaCA: resultados.protecciones.pastillaCA,
        cableCA: resultados.protecciones.cableCA,
      },
      strings: resultados.protecciones.strings,
      tipoConexion: resultados.tipoConexion,
    });

    router.push({
      pathname: '/quotes',
      params: {
        clienteParam: nc,
        itemsParam:   items,
        roiParam:     JSON.stringify(resultados.roi),
        ingParam:     ingData,
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
              <TouchableOpacity style={[s.calcBtn, { backgroundColor:'#0EA5E9', marginTop:20 }]} onPress={enviarACotizacion}>
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <Text style={{ color:'#FFF', fontWeight:'bold', marginLeft:8, fontSize:15 }}>Preparar Cotización</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { padding:20, paddingBottom:50 },
  title:         { fontSize:20, fontWeight:'bold', marginBottom:12 },
  normaNote:     { fontSize:11, marginBottom:14, fontStyle:'italic' },
  label:         { fontSize:14, fontWeight:'bold', marginBottom:5 },
  row2:          { flexDirection:'row', justifyContent:'space-between', marginBottom:16 },
  actionBtn:     { width:'48%', flexDirection:'row', padding:12, borderRadius:8, justifyContent:'center', alignItems:'center' },
  btnTxt:        { color:'#FFF', fontWeight:'bold', marginLeft:8 },
  card:          { padding:20, borderRadius:12, borderWidth:1 },
  input:         { borderWidth:1, borderRadius:8, padding:12, fontSize:16 },
  selector:      { flexDirection:'row', alignItems:'center', padding:14, borderRadius:10, borderWidth:1.5, marginBottom:15 },
  calcBtn:       { backgroundColor:'#10B981', padding:16, borderRadius:8, alignItems:'center', marginTop:10, flexDirection:'row', justifyContent:'center' },
});
