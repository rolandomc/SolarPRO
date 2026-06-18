// utils/engineering.ts
// Normas aplicadas:
//   NOM-001-SEDE-2012  Art. 690 — Sistemas Fotovoltaicos
//   NMX-J-680-ANCE-2014 — Instalaciones FV interconectadas
//
// LOGICA DE DISTRIBUCION (corregida):
//   El punto de partida es dividir los paneles EQUITATIVAMENTE entre los MPPT
//   disponibles. Luego se verifica que esa configuracion cumple los limites
//   de voltaje (Voc invierno) y corriente (Isc x 1.56) segun NOM.
//   Si hay exceso, se ajusta reduciendo paneles en serie o aumentando strings.
import * as Location from 'expo-location';

export const obtenerHSPDesdeNasa = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permiso de GPS denegado');
    let location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    const response = await fetch(url);
    const data = await response.json();
    const hspAnual = data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;
    return { exito: true, hsp: hspAnual, lat, lon };
  } catch (error) {
    return { exito: false, error: (error as Error).message, hsp: 0, lat: 0, lon: 0 };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE DISEÑO  (NOM-001-SEDE-2012 / NMX-J-680-ANCE-2014)
// ════════════════════════════════════════════════════════════════════════════

// Temperatura minima de diseno Mexico (invierno critico)
// -10°C conservador para el pais completo (Sierra, Altiplano)
const T_MIN_DISENO = -10;   // °C
const T_STC        = 25;    // °C — Condiciones Estandar de Test

// Coeficiente tipico Voc paneles monocristalinos: -0.29%/°C
// En invierno (T baja) el Voc SUBE → riesgo de dañar el inversor
const COEF_TEMP_VOC = -0.0029;   // /°C

// Coeficiente tipico Isc: +0.04%/°C (sube ligeramente en calor)
// Para el calculo de corriente usamos STC como peor caso practico
const COEF_TEMP_ISC = 0.0004;    // /°C

// Factores de seguridad NOM-001-SEDE-2012 art. 690.8
//   Isc_diseno = Isc × 1.25 (irradiancia aumentada)
//   I_conductor = Isc_diseno × 1.25 (uso continuo, art. 310)
//   I_total_NOM = Isc × 1.25 × 1.25 = × 1.5625
const FS_IRRADIANCIA = 1.25;
const FS_CONTINUO    = 1.25;
const FS_TOTAL_CC    = FS_IRRADIANCIA * FS_CONTINUO;  // 1.5625

// Margen de seguridad voltaje: 5% bajo el maximo del inversor
const MARGEN_VOC = 0.95;

// ════════════════════════════════════════════════════════════════════════════
// CORRECCIONES DE TEMPERATURA (NOM-001 Art. 690.7)
// ════════════════════════════════════════════════════════════════════════════
// Voc_invierno = Voc_stc × [1 + (-0.0029) × (-10 - 25)]
//             = Voc_stc × [1 + (-0.0029) × (-35)]
//             = Voc_stc × 1.1015   → sube ~10.15%
const vocInvierno = (voc: number): number =>
  voc * (1 + COEF_TEMP_VOC * (T_MIN_DISENO - T_STC));

const iscInvierno = (isc: number): number =>
  isc * (1 + COEF_TEMP_ISC * (T_MIN_DISENO - T_STC));

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ════════════════════════════════════════════════════════════════════════════
export interface ResultadoStrings {
  panelesPorString:      number;
  stringsEnParalelo:     number;   // strings en paralelo POR MPPT
  stringsTotalSistema:   number;
  mpptUsados:            number;
  vocStringStc:          number;   // Voc string a 25°C
  vocStringInvierno:     number;   // Voc string corregido -10°C (critico)
  vmpString:             number;   // Vmp string (punto de trabajo MPPT)
  iscString:             number;   // Isc de UN string
  corrienteEntradaMPPT:  number;   // Isc × stringsEnParalelo (entrada al MPPT)
  corrienteDisenoCC:     number;   // corrienteEntradaMPPT × 1.5625 (NOM)
  distribucionMPPT:      { mppt: number; strings: number; paneles: number }[];
  vocDentroLimite:       boolean;
  iscDentroLimite:       boolean;
  mpptSuficientes:       boolean;
  alertas:               string[];
  errores:               string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULO PRINCIPAL DE STRINGS
// Logica:
//   PASO 1 — Dividir paneles entre MPPT disponibles (punto de partida ideal)
//   PASO 2 — Calcular paneles en serie por string = ceil(paneles/mppt)
//   PASO 3 — Verificar Voc_invierno × panelesSerie ≤ Vmax_inversor × 0.95
//   PASO 4 — Si excede, reducir panelesSerie (aumenta strings, reparte mas)
//   PASO 5 — Verificar Isc × strings_paralelo × 1.56 ≤ imax_por_mppt
//   PASO 6 — Si excede corriente, agregar mas MPPT o reducir strings/MPPT
// ════════════════════════════════════════════════════════════════════════════
export const calcularArregloStrings = (
  panel: any,
  inversor: any,
  numPaneles: number
): ResultadoStrings => {
  const alertas: string[] = [];
  const errores: string[] = [];

  const vocPanelInv  = vocInvierno(panel.voc);     // Voc corregido invierno
  const vMaxEfectivo = inversor.max_dc_volts * MARGEN_VOC;  // Vmax con margen 5%

  // ── PASO 1: Limite fisico de paneles en serie (voltaje) ──────────────────
  // Nunca puede exceder este numero sin importar la configuracion
  const maxPanelesSerie = Math.floor(vMaxEfectivo / vocPanelInv);
  // Minimo: Vmp_string debe superar el umbral MPPT (~80V tipico)
  const minPanelesSerie = Math.max(2, Math.ceil(80 / panel.vmp));

  // ── PASO 2: Punto de partida — distribuir entre MPPT disponibles ─────────
  // Ejemplo: 12 paneles, 2 MPPT → 6 paneles por MPPT → 1 string de 6 en serie
  // Ejemplo: 10 paneles, 2 MPPT → 5 paneles por MPPT → 1 string de 5 en serie
  // Ejemplo: 16 paneles, 2 MPPT → 8 paneles por MPPT → 1 string de 8 en serie
  const mpptDisponibles   = inversor.num_mppt;
  const panelesPorMPPT_ideal = Math.ceil(numPaneles / mpptDisponibles);

  // Paneles en serie iniciales = paneles por MPPT (1 string por MPPT de inicio)
  // Luego se ajusta si hay demasiados en paralelo o si excede voltaje
  let panelesPorString = panelesPorMPPT_ideal;

  // ── PASO 3: Ajustar paneles en serie para no exceder voltaje maximo ───────
  if (panelesPorString > maxPanelesSerie) {
    panelesPorString = maxPanelesSerie;
  }
  if (panelesPorString < minPanelesSerie) {
    panelesPorString = minPanelesSerie;
  }

  // ── PASO 4: Strings totales con los paneles en serie elegidos ────────────
  const stringsTotalSistema = Math.ceil(numPaneles / panelesPorString);

  // ── PASO 5: Limite de corriente por MPPT ─────────────────────────────────
  // Cuantos strings en paralelo caben en un MPPT sin exceder su corriente max?
  // Condicion: strings_paralelo × Isc × 1.5625 ≤ imax_por_mppt
  const maxStringsPorMPPT = Math.max(1,
    Math.floor(inversor.imax_por_mppt / (panel.isc * FS_TOTAL_CC))
  );

  // ── PASO 6: MPPT necesarios y distribucion ───────────────────────────────
  // Cuantos MPPT se necesitan para alojar todos los strings sin exceder corriente?
  const mpptNecesarios = Math.ceil(stringsTotalSistema / maxStringsPorMPPT);

  // Usamos TODOS los MPPT disponibles para distribuir mejor la carga,
  // siempre que haya al menos 1 string por MPPT
  const mpptUsados = Math.min(
    Math.max(mpptNecesarios, Math.min(mpptDisponibles, stringsTotalSistema)),
    mpptDisponibles
  );

  // Strings por MPPT (distribucion lo mas uniforme posible)
  const stringsEnParalelo = Math.ceil(stringsTotalSistema / mpptUsados);

  // ── PASO 7: Distribucion real por cada MPPT ───────────────────────────────
  // El ultimo MPPT puede tener menos strings si el total no es multiplo
  let stringsRestantes = stringsTotalSistema;
  const distribucionMPPT: { mppt: number; strings: number; paneles: number }[] = [];
  for (let i = 0; i < mpptUsados; i++) {
    const stringsEste = Math.min(stringsEnParalelo, stringsRestantes);
    distribucionMPPT.push({
      mppt: i + 1,
      strings: stringsEste,
      paneles: stringsEste * panelesPorString,
    });
    stringsRestantes -= stringsEste;
    if (stringsRestantes <= 0) break;
  }

  // ── PASO 8: Calculos electricos del string y del bus DC ───────────────────
  const vocStringStc     = parseFloat((panelesPorString * panel.voc).toFixed(1));
  const vocStringInvierno= parseFloat((panelesPorString * vocPanelInv).toFixed(1));
  const vmpString        = parseFloat((panelesPorString * panel.vmp).toFixed(1));
  const iscString        = parseFloat(panel.isc.toFixed(2));

  // Corriente total en la entrada del MPPT = strings_paralelo × Isc_panel
  const corrienteEntradaMPPT = parseFloat((stringsEnParalelo * panel.isc).toFixed(2));
  // Corriente de diseño NOM (lo que dimensiona el fusible y el conductor)
  const corrienteDisenoCC = parseFloat((stringsEnParalelo * panel.isc * FS_TOTAL_CC).toFixed(2));

  // ── PASO 9: Validaciones de norma ─────────────────────────────────────────

  // Voltaje (NOM-001 Art. 690.7)
  const vocDentroLimite = vocStringInvierno <= inversor.max_dc_volts;
  if (!vocDentroLimite) {
    errores.push(
      `❌ NOM-001 690.7: Voc invierno del string ${vocStringInvierno}V excede Vmax inversor ${inversor.max_dc_volts}V`
    );
  } else if (vocStringInvierno > inversor.max_dc_volts * 0.90) {
    alertas.push(
      `⚠️ Voc invierno ${vocStringInvierno}V = ${Math.round(vocStringInvierno/inversor.max_dc_volts*100)}% del limite (margen estrecho)`
    );
  }

  // Corriente (NOM-001 Art. 690.8)
  const iscDentroLimite = corrienteDisenoCC <= inversor.imax_por_mppt;
  if (!iscDentroLimite) {
    errores.push(
      `❌ NOM-001 690.8: Corriente diseño ${corrienteDisenoCC}A (Isc×1.56) excede MPPT max ${inversor.imax_por_mppt}A`
    );
  }

  // MPPT suficientes
  const mpptSuficientes = mpptNecesarios <= mpptDisponibles;
  if (!mpptSuficientes) {
    errores.push(
      `❌ Se necesitan ${mpptNecesarios} MPPT pero el inversor solo tiene ${mpptDisponibles}`
    );
  }

  // Ratio DC/AC sobredimensionado (NMX-J-680: max recomendado 1.30)
  const ratioDC_AC = (numPaneles * panel.pmax) / inversor.pmax_ac;
  if (ratioDC_AC > 1.30) {
    alertas.push(
      `⚠️ Ratio DC/AC = ${ratioDC_AC.toFixed(2)} — maximo recomendado 1.30 (NMX-J-680)`
    );
  }

  // Informativo: si paneles no son divisibles exacto entre strings
  const panelesSobrantes = numPaneles - (stringsTotalSistema * panelesPorString - (panelesPorString - (numPaneles % panelesPorString || panelesPorString)));
  if (numPaneles % panelesPorString !== 0) {
    alertas.push(
      `ℹ️ ${numPaneles} paneles no divide exacto en strings de ${panelesPorString} — el ultimo string tiene ${numPaneles % panelesPorString} paneles`
    );
  }

  return {
    panelesPorString,
    stringsEnParalelo,
    stringsTotalSistema,
    mpptUsados,
    vocStringStc,
    vocStringInvierno,
    vmpString,
    iscString,
    corrienteEntradaMPPT,
    corrienteDisenoCC,
    distribucionMPPT,
    vocDentroLimite,
    iscDentroLimite,
    mpptSuficientes,
    alertas,
    errores,
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
// PROTECCIONES ELECTRICAS  (NOM-001-SEDE-2012 art. 690.8 + art. 310)
// ════════════════════════════════════════════════════════════════════════════
export const calcularProtecciones = (panel: any, inversor: any, numPaneles: number) => {
  const strings = calcularArregloStrings(panel, inversor, numPaneles);

  // ── CC: por string ────────────────────────────────────────────────────────
  // Corriente de diseño = Isc × 1.25 × 1.25 = × 1.5625  (NOM-001 art. 690.8)
  const iDisenoCC = panel.isc * FS_TOTAL_CC;
  const fusiblesComerciales = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80];
  const fusibleCC = fusiblesComerciales.find(f => f >= iDisenoCC) ?? Math.ceil(iDisenoCC / 5) * 5;

  // Conductor CC solar (THWN-2 / cable FV 90°C, tabla NOM)
  let cableCC = '12 AWG (Solar FV)';
  if (iDisenoCC > 15) cableCC = '10 AWG (Solar FV)';
  if (iDisenoCC > 25) cableCC = '8 AWG (Solar FV)';
  if (iDisenoCC > 35) cableCC = '6 AWG (Solar FV)';

  // ── CA ────────────────────────────────────────────────────────────────────
  // Corriente de diseño CA = Iac_nominal × 1.25  (uso continuo, NOM art. 310)
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
    fusibleCC,
    cableCC,
    iDisenoCC: parseFloat(iDisenoCC.toFixed(2)),
    pastillaCA,
    cableCA,
    iDisenoCA: parseFloat(iDisenoCA.toFixed(2)),
    voltajeSistema: strings.vocStringInvierno.toFixed(1),
  };
};
