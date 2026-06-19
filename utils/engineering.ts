// utils/engineering.ts
// Normas aplicadas:
//   NOM-001-SEDE-2012  Art. 690 — Sistemas Fotovoltaicos
//   NMX-J-680-ANCE-2014 — Instalaciones FV interconectadas
//
// REGLA CLAVE (corriente de diseño):
//   La corriente de diseño NOM (Isc × 1.25 × 1.25 = × 1.5625) es SOLO para
//   dimensionar fusibles y conductores (NOM-001 art. 690.8 + art. 310).
//   Para verificar si el MPPT soporta la carga se usa la corriente REAL:
//     MPPT:    corrienteEntradaMPPT (Isc × strings_paralelo) ≤ imax_por_mppt
//     Fusible: iDisenoCC            (Isc × 1.5625)           → calibre
//     Voltaje: vocStringInvierno    (Voc × factor temp)      ≤ max_dc_volts
import * as Location from 'expo-location';
import { PANELES_DB, INVERSORES_DB } from '../data/componentsDB';

// ════════════════════════════════════════════════════════════════════════════
// NASA POWER — HSP real por GPS
// Devuelve irradiancia horizontal global (kWh/m²/día) anual + mensual
// API: https://power.larc.nasa.gov/
// ════════════════════════════════════════════════════════════════════════════
export interface HSPResult {
  exito:      boolean;
  hsp:        number;                   // promedio anual kWh/m²/día
  hspMensual: Record<string, number>;   // JAN…DEC + ANN
  lat:        number;
  lon:        number;
  ciudad?:    string;                   // geocodificación inversa
  error?:     string;
}

export const obtenerHSPDesdeNasa = async (): Promise<HSPResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permiso de GPS denegado');

    const location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;

    // Geocodificación inversa para nombre de ciudad
    let ciudad: string | undefined;
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geo.length > 0) {
        const g = geo[0];
        ciudad = [g.city || g.subregion, g.region, g.country]
          .filter(Boolean).join(', ');
      }
    } catch { /* opcional, continuar sin ciudad */ }

    // NASA POWER — climatología mensual + anual
    const url = [
      'https://power.larc.nasa.gov/api/temporal/climatology/point',
      '?parameters=ALLSKY_SFC_SW_DWN',
      '&community=RE',
      `&longitude=${lon.toFixed(4)}`,
      `&latitude=${lat.toFixed(4)}`,
      '&format=JSON',
    ].join('');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`NASA POWER HTTP ${response.status}`);
    const data = await response.json();
    const param = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    if (!param) throw new Error('Respuesta inesperada de NASA POWER');

    const hspAnual: number = param.ANN;
    const MESES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const hspMensual: Record<string, number> = { ANN: hspAnual };
    MESES.forEach(m => { hspMensual[m] = param[m] ?? hspAnual; });

    return { exito: true, hsp: hspAnual, hspMensual, lat, lon, ciudad };
  } catch (error) {
    return { exito: false, hsp: 0, hspMensual: {}, lat: 0, lon: 0, error: (error as Error).message };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════
const T_MIN_DISENO  = -10;      // °C  temperatura mínima diseño México
const T_STC         = 25;       // °C  condiciones estándar de test
const COEF_TEMP_VOC = -0.0029;  // /°C  coeficiente Voc típico monocristalino
const MARGEN_VOC    = 0.95;     // 5% colchón sobre Vmax inversor

const FS_IRRADIANCIA = 1.25;
const FS_CONTINUO    = 1.25;
const FS_TOTAL_CC    = FS_IRRADIANCIA * FS_CONTINUO; // 1.5625

// ════════════════════════════════════════════════════════════════════════════
// CORRECCIÓN DE TEMPERATURA (NOM-001 Art. 690.7)
// ════════════════════════════════════════════════════════════════════════════
const vocInvierno = (voc: number): number =>
  voc * (1 + COEF_TEMP_VOC * (T_MIN_DISENO - T_STC));

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ════════════════════════════════════════════════════════════════════════════
export interface ResultadoStrings {
  panelesPorString:     number;
  stringsEnParalelo:    number;
  stringsTotalSistema:  number;
  mpptUsados:           number;
  vocStringStc:         number;
  vocStringInvierno:    number;
  vmpString:            number;
  iscString:            number;
  corrienteEntradaMPPT: number;
  iDisenoFusibleStr:    number;
  iDisenoFusibleMPPT:   number;
  distribucionMPPT:     { mppt: number; strings: number; paneles: number }[];
  vocDentroLimite:      boolean;
  iscDentroLimite:      boolean;
  mpptSuficientes:      boolean;
  alertas:              string[];
  errores:              string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CÁLCULO PRINCIPAL DE STRINGS
// ════════════════════════════════════════════════════════════════════════════
export const calcularArregloStrings = (
  panel: any,
  inversor: any,
  numPaneles: number
): ResultadoStrings => {
  const alertas: string[] = [];
  const errores: string[] = [];

  const vocPanelInv  = vocInvierno(panel.voc);
  const vMaxEfectivo = inversor.max_dc_volts * MARGEN_VOC;

  const maxPanelesSerie   = Math.floor(vMaxEfectivo / vocPanelInv);
  const minPanelesSerie   = Math.max(2, Math.ceil(80 / panel.vmp));
  const maxStringsPorMPPT = Math.max(1, Math.floor(inversor.imax_por_mppt / panel.isc));

  const mpptDisponibles = inversor.num_mppt;
  let panelesPorString  = Math.ceil(numPaneles / mpptDisponibles);
  if (panelesPorString > maxPanelesSerie) panelesPorString = maxPanelesSerie;
  if (panelesPorString < minPanelesSerie) panelesPorString = minPanelesSerie;

  const stringsTotalSistema = Math.ceil(numPaneles / panelesPorString);
  const mpptNecesarios  = Math.ceil(stringsTotalSistema / maxStringsPorMPPT);
  const mpptUsados = Math.min(
    Math.max(mpptNecesarios, Math.min(mpptDisponibles, stringsTotalSistema)),
    mpptDisponibles
  );
  const stringsEnParalelo = Math.ceil(stringsTotalSistema / mpptUsados);

  let stringsRestantes = stringsTotalSistema;
  const distribucionMPPT: { mppt: number; strings: number; paneles: number }[] = [];
  for (let i = 0; i < mpptUsados; i++) {
    const stringsEste = Math.min(stringsEnParalelo, stringsRestantes);
    distribucionMPPT.push({ mppt: i+1, strings: stringsEste, paneles: stringsEste * panelesPorString });
    stringsRestantes -= stringsEste;
    if (stringsRestantes <= 0) break;
  }

  const vocStringStc         = parseFloat((panelesPorString * panel.voc).toFixed(1));
  const vocStringInvierno    = parseFloat((panelesPorString * vocPanelInv).toFixed(1));
  const vmpString            = parseFloat((panelesPorString * panel.vmp).toFixed(1));
  const iscString            = parseFloat(panel.isc.toFixed(2));
  const corrienteEntradaMPPT = parseFloat((stringsEnParalelo * panel.isc).toFixed(2));
  const iDisenoFusibleStr    = parseFloat((panel.isc * FS_TOTAL_CC).toFixed(2));
  const iDisenoFusibleMPPT   = parseFloat((corrienteEntradaMPPT * FS_TOTAL_CC).toFixed(2));

  const vocDentroLimite = vocStringInvierno <= inversor.max_dc_volts;
  if (!vocDentroLimite) {
    errores.push(`❌ NOM-001 690.7: Voc invierno ${vocStringInvierno}V excede Vmax inversor ${inversor.max_dc_volts}V`);
  } else if (vocStringInvierno > inversor.max_dc_volts * 0.90) {
    alertas.push(`⚠️ Voc invierno ${vocStringInvierno}V = ${Math.round(vocStringInvierno / inversor.max_dc_volts * 100)}% del límite`);
  }

  const iscDentroLimite = corrienteEntradaMPPT <= inversor.imax_por_mppt;
  if (!iscDentroLimite) {
    errores.push(`❌ Corriente real MPPT: ${corrienteEntradaMPPT}A (${stringsEnParalelo} strings × ${panel.isc}A) excede límite del inversor ${inversor.imax_por_mppt}A`);
  }

  const mpptSuficientes = mpptNecesarios <= mpptDisponibles;
  if (!mpptSuficientes) {
    errores.push(`❌ Se necesitan ${mpptNecesarios} MPPT pero el inversor tiene ${mpptDisponibles}`);
  }

  const ratioDC_AC = (numPaneles * panel.pmax) / inversor.pmax_ac;
  if (ratioDC_AC > 1.30) {
    alertas.push(`⚠️ Ratio DC/AC = ${ratioDC_AC.toFixed(2)} — recomendado máx 1.30 (NMX-J-680)`);
  }
  if (numPaneles % panelesPorString !== 0) {
    alertas.push(`ℹ️ El último string tiene ${numPaneles % panelesPorString} paneles (los demás tienen ${panelesPorString})`);
  }

  return {
    panelesPorString, stringsEnParalelo, stringsTotalSistema, mpptUsados,
    vocStringStc, vocStringInvierno, vmpString, iscString,
    corrienteEntradaMPPT, iDisenoFusibleStr, iDisenoFusibleMPPT,
    distribucionMPPT, vocDentroLimite, iscDentroLimite, mpptSuficientes,
    alertas, errores,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// SUGERENCIA DE INVERSOR COMPATIBLE
// ════════════════════════════════════════════════════════════════════════════
export const sugerirInversorCompatible = (
  panel: any,
  numPaneles: number,
  inversoresDB: any[],
  potenciaKW: number
): any[] => {
  return inversoresDB
    .filter(inv => {
      const res = calcularArregloStrings(panel, inv, numPaneles);
      return res.errores.length === 0 && inv.max_dc_input >= potenciaKW * 1000;
    })
    .sort((a, b) => a.max_dc_input - b.max_dc_input);
};

// ════════════════════════════════════════════════════════════════════════════
// PROTECCIONES ELÉCTRICAS  (NOM-001-SEDE-2012 art. 690.8 + art. 310)
// ════════════════════════════════════════════════════════════════════════════
export const calcularProtecciones = (panel: any, inversor: any, numPaneles: number) => {
  const strings = calcularArregloStrings(panel, inversor, numPaneles);
  const fusiblesComerciales = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80];

  const iDisenoFusStr = strings.iDisenoFusibleStr;
  const fusibleCCStr  = fusiblesComerciales.find(f => f >= iDisenoFusStr) ?? Math.ceil(iDisenoFusStr / 5) * 5;

  let cableCC = '12 AWG (Solar FV)';
  if (iDisenoFusStr > 15) cableCC = '10 AWG (Solar FV)';
  if (iDisenoFusStr > 25) cableCC = '8 AWG (Solar FV)';
  if (iDisenoFusStr > 35) cableCC = '6 AWG (Solar FV)';

  const iDisenoCA = inversor.i_max_ac * FS_IRRADIANCIA;
  const pastillaCA = fusiblesComerciales.find(f => f >= iDisenoCA) ?? Math.ceil(iDisenoCA / 5) * 5;

  let cableCA = '12 AWG THW-LS';
  if (iDisenoCA > 15)  cableCA = '10 AWG THW-LS';
  if (iDisenoCA > 25)  cableCA = '8 AWG THW-LS';
  if (iDisenoCA > 35)  cableCA = '6 AWG THW-LS';
  if (iDisenoCA > 55)  cableCA = '4 AWG THW-LS';
  if (iDisenoCA > 70)  cableCA = '3 AWG THW-LS';
  if (iDisenoCA > 90)  cableCA = '2/0 AWG THW-LS';
  if (iDisenoCA > 120) cableCA = '3/0 AWG THW-LS';

  return {
    strings,
    fusibleCC: fusibleCCStr,
    cableCC,
    iDisenoCC: parseFloat(iDisenoFusStr.toFixed(2)),
    pastillaCA,
    cableCA,
    iDisenoCA: parseFloat(iDisenoCA.toFixed(2)),
    voltajeSistema: strings.vocStringInvierno.toFixed(1),
  };
};

// ════════════════════════════════════════════════════════════════════════════
// ROI CON HSP REAL
// Reemplaza el valor fijo 4.5 por el HSP obtenido de NASA POWER
// kWh/mes = kWp × HSP_real × 30 días × PR(0.80)
// ════════════════════════════════════════════════════════════════════════════
const PRECIO_KWH_POR_TARIFA: Record<string, number> = {
  'Residencial': 2.85, 'DAC': 2.85,
  '1': 1.80,  '1A': 1.80,
  'General BT': 3.20, '2': 3.20,
  '3': 2.50,  'General 3F': 2.50,
  'HM': 1.80, 'HM / MT': 1.80,
  'OM': 2.10, 'MT': 1.80,
};

export const calcularROIConHSP = (
  consumoMensualKwh: number,
  costoTotal: number,
  tarifa: string,
  potenciaKWp: number,
  hsp: number,           // HSP real de NASA POWER o fallback 4.5
) => {
  const precioKwh        = PRECIO_KWH_POR_TARIFA[tarifa] ?? 2.85;
  const PR               = 0.80;
  const kwGeneradosMes   = potenciaKWp * hsp * 30 * PR;       // ← HSP real
  const kwhAhorroDirecto = Math.min(consumoMensualKwh, kwGeneradosMes);

  const ahorroMensual   = Math.round(kwhAhorroDirecto * precioKwh);
  const ahorroBimestral = ahorroMensual * 2;
  const ahorroAnual     = ahorroMensual * 12;
  const roiMeses        = ahorroMensual > 0 ? Math.round(costoTotal / ahorroMensual) : 9999;
  const roiAnos         = (roiMeses / 12).toFixed(1);
  const ahorroTotal25   = ahorroAnual * 25;
  const gananciaTotal25 = ahorroTotal25 - costoTotal;

  return {
    potenciaKWp,
    precioKwh,
    hspUsado: hsp,
    kwGeneradosMes: Math.round(kwGeneradosMes),
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

// ════════════════════════════════════════════════════════════════════════════
// COMPARATIVA DE OPCIONES
// Genera 3 variantes: Económica / Estándar / Premium
// Usa distintos paneles e inversores del DB para el mismo consumo y HSP.
// ════════════════════════════════════════════════════════════════════════════
export interface OpcionComparativa {
  id:               'economica' | 'estandar' | 'premium';
  etiqueta:         string;
  color:            string;
  icono:            string;
  panel:            any;
  inversor:         any;
  numPaneles:       number;
  potenciaKWp:      number;
  costoTotal:       number;
  costoPaneles:     number;
  costoInversor:    number;
  costoInstalacion: number;
  roi:              ReturnType<typeof calcularROIConHSP>;
  cumpleNorm:       boolean;
}

const elegirInversorOpcion = (potenciaKW: number, fases: 1 | 3, marcas?: string[]): any => {
  const w = potenciaKW * 1000;
  let candidatos = INVERSORES_DB.filter(i => i.fases === fases && i.max_dc_input >= w);
  if (marcas && marcas.length > 0) {
    const filtrado = candidatos.filter(i => marcas.includes(i.marca));
    if (filtrado.length > 0) candidatos = filtrado;
  }
  if (candidatos.length === 0) candidatos = INVERSORES_DB.filter(i => i.fases === fases);
  if (candidatos.length === 0) return INVERSORES_DB[0];
  return candidatos.reduce((p, c) => c.max_dc_input < p.max_dc_input ? c : p);
};

export const generarComparativaOpciones = (
  consumoMensualKwh: number,
  tarifa: string,
  fases: 1 | 3,
  hsp: number,
  panelBase?: any,   // panel seleccionado por el usuario → opción Estándar
): OpcionComparativa[] => {

  const panelesMono = PANELES_DB.slice().sort((a, b) => a.precio_mxn - b.precio_mxn);
  const tercio = Math.ceil(panelesMono.length / 3);

  const panelEconomico = panelesMono[0];
  const panelEstandar  = panelBase ?? panelesMono[Math.min(tercio, panelesMono.length - 1)];
  const panelPremium   = panelesMono[panelesMono.length - 1];

  const configs: {
    id: OpcionComparativa['id'];
    etiqueta: string; color: string; icono: string;
    panel: any; marcas?: string[];
  }[] = [
    { id: 'economica', etiqueta: 'Económica',  color: '#10B981', icono: 'leaf-outline',   panel: panelEconomico, marcas: ['Growatt','Solis'] },
    { id: 'estandar',  etiqueta: 'Estándar',   color: '#0EA5E9', icono: 'star-outline',    panel: panelEstandar,  marcas: ['Growatt','Fronius','Huawei'] },
    { id: 'premium',   etiqueta: 'Premium',    color: '#8B5CF6', icono: 'diamond-outline', panel: panelPremium,   marcas: ['Fronius','SolarEdge','SMA'] },
  ];

  const PR                  = 0.80;
  const COSTO_WP_INSTALACION = 8; // MXN/W mano de obra + materiales

  return configs.map(cfg => {
    const panel = cfg.panel;
    const eDiaria     = (consumoMensualKwh / 30) * 1.20;
    const potArregloW = (eDiaria / hsp) * 1000;
    const numPaneles  = Math.ceil(potArregloW / panel.pmax);
    const potenciaKWp = (numPaneles * panel.pmax) / 1000;

    const inversor         = elegirInversorOpcion(potenciaKWp, fases, cfg.marcas);
    const costoPaneles     = numPaneles * panel.precio_mxn;
    const costoInversor    = inversor.precio_mxn;
    const costoInstalacion = Math.round(potenciaKWp * 1000 * COSTO_WP_INSTALACION);
    const costoTotal       = costoPaneles + costoInversor + costoInstalacion;

    const roi = calcularROIConHSP(consumoMensualKwh, costoTotal, tarifa, potenciaKWp, hsp);
    const prot = calcularArregloStrings(panel, inversor, numPaneles);

    return {
      id: cfg.id, etiqueta: cfg.etiqueta, color: cfg.color, icono: cfg.icono,
      panel, inversor, numPaneles, potenciaKWp,
      costoTotal, costoPaneles, costoInversor, costoInstalacion,
      roi, cumpleNorm: prot.errores.length === 0,
    };
  });
};
