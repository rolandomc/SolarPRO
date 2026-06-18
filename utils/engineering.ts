// utils/engineering.ts
// Normas aplicadas:
//   NOM-001-SEDE-2012  Art. 690 — Sistemas Fotovoltaicos
//   NMX-J-680-ANCE-2014 — Instalaciones FV interconectadas
//
// REGLA CLAVE (error corregido):
//   La corriente de diseño NOM (Isc × 1.25 × 1.25 = × 1.5625) es SOLO para
//   dimensionar fusibles y conductores (NOM-001 art. 690.8 + art. 310).
//
//   Para verificar si el MPPT del inversor soporta la carga se usa la
//   corriente REAL de entrada = Isc_panel × strings_en_paralelo.
//   El inversor especifica su imax_por_mppt como corriente fisica maxima.
//
//   Comparaciones correctas:
//     MPPT:      corrienteEntradaMPPT  (Isc × strings)       ≤ imax_por_mppt
//     Fusible:   iDisenoCC            (Isc × 1.5625 string)  → elige calibre
//     Voltaje:   vocStringInvierno    (Voc × factor temp)    ≤ max_dc_volts
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
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const T_MIN_DISENO  = -10;     // °C  temperatura minima de diseño Mexico
const T_STC         = 25;     // °C  condiciones estandar de test
const COEF_TEMP_VOC = -0.0029; // /°C  coeficiente Voc tipico monocristalino
const MARGEN_VOC    = 0.95;   // 5% de colchon sobre Vmax inversor

// Factores NOM-001-SEDE-2012 art. 690.8 + art. 310
// USO EXCLUSIVO para dimensionar fusibles y conductores CC:
//   Paso 1: Isc_circuito = Isc × 1.25  (irradiancia sobre 1000 W/m²)
//   Paso 2: I_conductor  = Isc_circuito × 1.25  (uso continuo >3h)
//   Total:  Isc_diseño  = Isc × 1.5625
const FS_IRRADIANCIA = 1.25;
const FS_CONTINUO    = 1.25;
const FS_TOTAL_CC    = FS_IRRADIANCIA * FS_CONTINUO; // 1.5625  solo para fusible/cable

// ════════════════════════════════════════════════════════════════════════════
// CORRECCION DE TEMPERATURA (NOM-001 Art. 690.7)
// ════════════════════════════════════════════════════════════════════════════
// En invierno el Voc SUBE porque el coeficiente es negativo y T_min < T_stc:
//   Voc_inv = Voc_stc × [1 + (-0.0029) × (-10 - 25)] = Voc_stc × 1.1015
// Esto es el peor caso para el voltaje → puede dañar el inversor.
const vocInvierno = (voc: number): number =>
  voc * (1 + COEF_TEMP_VOC * (T_MIN_DISENO - T_STC));

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ════════════════════════════════════════════════════════════════════════════
export interface ResultadoStrings {
  panelesPorString:     number;
  stringsEnParalelo:    number;  // strings en paralelo POR MPPT
  stringsTotalSistema:  number;
  mpptUsados:           number;
  // Voltajes
  vocStringStc:         number;  // Voc del string a 25°C (referencia)
  vocStringInvierno:    number;  // Voc del string a -10°C (← comparar con Vmax inversor)
  vmpString:            number;  // Vmp del string = punto de trabajo MPPT
  // Corrientes — tres valores distintos con propósitos distintos:
  iscString:            number;  // Isc de 1 solo string (= Isc del panel)
  corrienteEntradaMPPT: number;  // Isc × strings_paralelo  (← comparar con imax_por_mppt)
  iDisenoFusibleStr:    number;  // Isc_1string × 1.5625     (← dimensionar fusible por string)
  iDisenoFusibleMPPT:   number;  // corrienteEntradaMPPT × 1.5625 (← fusible entrada combiner)
  // Distribución
  distribucionMPPT:     { mppt: number; strings: number; paneles: number }[];
  // Validaciones
  vocDentroLimite:      boolean; // vocStringInvierno ≤ max_dc_volts
  iscDentroLimite:      boolean; // corrienteEntradaMPPT ≤ imax_por_mppt
  mpptSuficientes:      boolean;
  alertas:              string[];
  errores:              string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULO PRINCIPAL
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

  // ── 1. Límite de voltaje: max paneles en serie ───────────────────────────
  // Usar Voc corregido por invierno (NOM-001 Art. 690.7)
  // vocStringInvierno = panelesSerie × vocPanelInv ≤ max_dc_volts
  const maxPanelesSerie = Math.floor(vMaxEfectivo / vocPanelInv);
  const minPanelesSerie = Math.max(2, Math.ceil(80 / panel.vmp));

  // ── 2. Límite de corriente: max strings en paralelo por MPPT ────────────
  // El inversor limita la corriente FISICA real que puede recibir por MPPT.
  // corrienteEntradaMPPT = Isc_panel × stringsEnParalelo ≤ imax_por_mppt
  // (NO se aplica el factor 1.5625 aquí — ese es solo para fusible/cable)
  const maxStringsPorMPPT = Math.max(1,
    Math.floor(inversor.imax_por_mppt / panel.isc)
  );

  // ── 3. Punto de partida: distribuir paneles entre MPPT disponibles ───────
  // 12 paneles, 2 MPPT → 6 paneles/MPPT → 1 string de 6 por MPPT
  const mpptDisponibles = inversor.num_mppt;
  let panelesPorString  = Math.ceil(numPaneles / mpptDisponibles);

  // Ajustar por límites
  if (panelesPorString > maxPanelesSerie) panelesPorString = maxPanelesSerie;
  if (panelesPorString < minPanelesSerie) panelesPorString = minPanelesSerie;

  // ── 4. Strings totales y distribución ──────────────────────────────────
  const stringsTotalSistema = Math.ceil(numPaneles / panelesPorString);

  // MPPT necesarios para no exceder corriente real por MPPT
  const mpptNecesarios  = Math.ceil(stringsTotalSistema / maxStringsPorMPPT);

  // Usar todos los MPPT disponibles para distribuir la carga equitativamente
  const mpptUsados = Math.min(
    Math.max(mpptNecesarios, Math.min(mpptDisponibles, stringsTotalSistema)),
    mpptDisponibles
  );

  const stringsEnParalelo = Math.ceil(stringsTotalSistema / mpptUsados);

  // ── 5. Distribución detallada por MPPT ─────────────────────────────────
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

  // ── 6. Calculos eléctricos ──────────────────────────────────────────────

  // Voltajes
  const vocStringStc      = parseFloat((panelesPorString * panel.voc).toFixed(1));
  const vocStringInvierno = parseFloat((panelesPorString * vocPanelInv).toFixed(1));
  const vmpString         = parseFloat((panelesPorString * panel.vmp).toFixed(1));

  // Corrientes
  const iscString = parseFloat(panel.isc.toFixed(2));

  // Corriente REAL que entra al MPPT = Isc_panel × strings_en_paralelo
  // Es la que se compara contra imax_por_mppt del inversor
  const corrienteEntradaMPPT = parseFloat((stringsEnParalelo * panel.isc).toFixed(2));

  // Corriente de diseño NOM para fusible de 1 string (Isc_1string × 1.5625)
  // Solo se usa para elegir el calibre del fusible y el conductor por string
  const iDisenoFusibleStr  = parseFloat((panel.isc * FS_TOTAL_CC).toFixed(2));

  // Corriente de diseño NOM para fusible de entrada al combiner/MPPT
  // (cuando hay strings en paralelo, el fusible del combiner ve la suma)
  const iDisenoFusibleMPPT = parseFloat((corrienteEntradaMPPT * FS_TOTAL_CC).toFixed(2));

  // ── 7. Validaciones ──────────────────────────────────────────────────────

  // A) Voltaje: comparar Voc_invierno del string vs Vmax del inversor
  //    (NOM-001 Art. 690.7)
  const vocDentroLimite = vocStringInvierno <= inversor.max_dc_volts;
  if (!vocDentroLimite) {
    errores.push(
      `❌ NOM-001 690.7: Voc invierno ${vocStringInvierno}V excede Vmax inversor ${inversor.max_dc_volts}V`
    );
  } else if (vocStringInvierno > inversor.max_dc_volts * 0.90) {
    alertas.push(
      `⚠️ Voc invierno ${vocStringInvierno}V = ${Math.round(vocStringInvierno / inversor.max_dc_volts * 100)}% del límite`
    );
  }

  // B) Corriente: comparar corriente REAL de entrada vs imax_por_mppt
  //    El inversor indica la corriente fisica maxima que acepta en su MPPT.
  //    NO se aplica 1.5625 aquí.
  const iscDentroLimite = corrienteEntradaMPPT <= inversor.imax_por_mppt;
  if (!iscDentroLimite) {
    errores.push(
      `❌ Corriente real MPPT: ${corrienteEntradaMPPT}A (${stringsEnParalelo} strings × ${panel.isc}A) excede límite del inversor ${inversor.imax_por_mppt}A`
    );
  }

  // C) MPPT suficientes
  const mpptSuficientes = mpptNecesarios <= mpptDisponibles;
  if (!mpptSuficientes) {
    errores.push(
      `❌ Se necesitan ${mpptNecesarios} MPPT pero el inversor tiene ${mpptDisponibles}`
    );
  }

  // D) Ratio DC/AC (NMX-J-680: recomendado máx 1.30)
  const ratioDC_AC = (numPaneles * panel.pmax) / inversor.pmax_ac;
  if (ratioDC_AC > 1.30) {
    alertas.push(
      `⚠️ Ratio DC/AC = ${ratioDC_AC.toFixed(2)} — recomendado máx 1.30 (NMX-J-680)`
    );
  }

  // E) Informativo: paneles sobrantes en el último string
  if (numPaneles % panelesPorString !== 0) {
    alertas.push(
      `ℹ️ El último string tiene ${numPaneles % panelesPorString} paneles (los demás tienen ${panelesPorString})`
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
    iDisenoFusibleStr,
    iDisenoFusibleMPPT,
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

  const fusiblesComerciales = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80];

  // ── CC: fusible POR STRING ─────────────────────────────────────────────
  // Isc_1string × 1.5625 (NOM-001 art. 690.8)
  // Este fusible protege el cable de cada string individual
  const iDisenoFusStr = strings.iDisenoFusibleStr;
  const fusibleCCStr  = fusiblesComerciales.find(f => f >= iDisenoFusStr) ?? Math.ceil(iDisenoFusStr / 5) * 5;

  // Cable del string: conductor solar 90°C (THWN-2 / USE-2)
  let cableCC = '12 AWG (Solar FV)';
  if (iDisenoFusStr > 15) cableCC = '10 AWG (Solar FV)';
  if (iDisenoFusStr > 25) cableCC = '8 AWG (Solar FV)';
  if (iDisenoFusStr > 35) cableCC = '6 AWG (Solar FV)';

  // ── CA: interruptor termomagnético ─────────────────────────────────────────
  // Iac_nominal × 1.25 (uso continuo, NOM art. 310)
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
    // CC
    fusibleCC:   fusibleCCStr,
    cableCC,
    iDisenoCC:   parseFloat(iDisenoFusStr.toFixed(2)),   // Isc_1str × 1.5625
    // CA
    pastillaCA,
    cableCA,
    iDisenoCA:   parseFloat(iDisenoCA.toFixed(2)),       // Iac × 1.25
    voltajeSistema: strings.vocStringInvierno.toFixed(1),
  };
};
