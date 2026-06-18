// utils/engineering.ts
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

// ─── CALCULO DE STRINGS / MPPT ───────────────────────────────────────────────
//
// Un "string" = paneles en SERIE  → suma voltajes, corriente igual
// Strings en PARALELO por MPPT   → suma corrientes, voltaje igual
//
// Restricciones a respetar:
//   1. Voc_string  = paneles_serie × Voc_panel  ≤  max_dc_volts  del inversor
//   2. Imp_string  = paneles_serie × Imp_panel  (el Vmp determina el punto de trabajo)
//   3. Isc_string_paralelo = strings_paralelo × Isc_panel ≤ imax_por_mppt
//   4. Total paneles distribuidos = numPaneles
//
export interface ResultadoStrings {
  panelesPorString: number;     // paneles en serie por string
  stringsEnParalelo: number;    // strings en paralelo por MPPT
  stringsTotal: number;         // strings totales
  mpptUsados: number;           // cuantos MPPT del inversor se usan
  panelesPorMPPT: number;       // paneles asignados a cada MPPT
  vocString: number;            // V voltaje Voc del string
  vmpString: number;            // V voltaje Vmp del string (trabajo)
  corrienteParalelo: number;    // A corriente Isc total en el bus DC
  alertas: string[];            // avisos de sobredimensionamiento
}

export const calcularArregloStrings = (
  panel: any,
  inversor: any,
  numPaneles: number
): ResultadoStrings => {
  const alertas: string[] = [];

  // 1. Paneles maximos en serie sin exceder voltaje maximo DC
  //    Se usa Voc (peor caso = temperatura fria)
  const maxPanelesSerie = Math.floor(inversor.max_dc_volts / panel.voc);
  // Paneles minimos en serie para superar voltaje minimo MPPT
  // (aprox 70% del Vmp nominal del inversor como referencia general ~100V)
  const minPanelesSerie = Math.max(1, Math.ceil(100 / panel.vmp));

  // Elegimos el maximo permitido
  let panelesPorString = Math.min(maxPanelesSerie, Math.floor(numPaneles / 1));
  if (panelesPorString < minPanelesSerie) panelesPorString = minPanelesSerie;
  if (panelesPorString > maxPanelesSerie) panelesPorString = maxPanelesSerie;

  // 2. Numero de strings totales
  const stringsTotal = Math.ceil(numPaneles / panelesPorString);

  // 3. Strings en paralelo por MPPT sin exceder imax_por_mppt
  //    Isc por string = panel.isc (corriente de cortocircuito, 1 string)
  //    Paralelo maximo por MPPT = floor(imax_por_mppt / panel.isc)
  const maxStringsPorMPPT = Math.max(1, Math.floor(inversor.imax_por_mppt / panel.isc));

  // 4. MPPT necesarios
  const mpptNecesarios = Math.ceil(stringsTotal / maxStringsPorMPPT);
  const mpptUsados = Math.min(mpptNecesarios, inversor.num_mppt);

  // Strings por MPPT (distribucion uniforme)
  const stringsEnParalelo = Math.ceil(stringsTotal / mpptUsados);
  const panelesPorMPPT = stringsEnParalelo * panelesPorString;

  // 5. Verificaciones
  const vocString = parseFloat((panelesPorString * panel.voc).toFixed(1));
  const vmpString = parseFloat((panelesPorString * panel.vmp).toFixed(1));
  const corrienteParalelo = parseFloat((stringsEnParalelo * panel.isc).toFixed(2));

  if (vocString > inversor.max_dc_volts) {
    alertas.push(`⚠️ Voc string ${vocString}V excede limite ${inversor.max_dc_volts}V`);
  }
  if (corrienteParalelo > inversor.imax_por_mppt) {
    alertas.push(`⚠️ Corriente ${corrienteParalelo}A excede MPPT max ${inversor.imax_por_mppt}A`);
  }
  if (mpptNecesarios > inversor.num_mppt) {
    alertas.push(`⚠️ Se necesitan ${mpptNecesarios} MPPT, inversor tiene ${inversor.num_mppt}`);
  }

  return { panelesPorString, stringsEnParalelo, stringsTotal, mpptUsados, panelesPorMPPT, vocString, vmpString, corrienteParalelo, alertas };
};

// ─── PROTECCIONES ELECTRICAS (NOM / NEC) ────────────────────────────────────
export const calcularProtecciones = (panel: any, inversor: any, numPaneles: number) => {
  const strings = calcularArregloStrings(panel, inversor, numPaneles);

  // Lado CC: fusible por string = Isc x 1.56
  const corrienteCCMax = panel.isc * 1.56;
  const fusibleRecomendadoCC = Math.ceil(corrienteCCMax / 5) * 5;
  const cableCC_AWG = fusibleRecomendadoCC > 20 ? "10 AWG" : "12 AWG (Solar)";

  // Lado CA: pastilla = I_ac_nominal x 1.25
  const corrienteCAMax = inversor.i_max_ac * 1.25;
  const pastillaRecomendadaCA = Math.ceil(corrienteCAMax / 5) * 5;
  let cableCA_AWG = "12 AWG";
  if (pastillaRecomendadaCA > 20) cableCA_AWG = "10 AWG";
  if (pastillaRecomendadaCA > 30) cableCA_AWG = "8 AWG";
  if (pastillaRecomendadaCA > 40) cableCA_AWG = "6 AWG";
  if (pastillaRecomendadaCA > 60) cableCA_AWG = "4 AWG";

  return {
    // Strings
    strings,
    // Protecciones
    fusibleCC: fusibleRecomendadoCC,
    cableCC: cableCC_AWG,
    pastillaCA: pastillaRecomendadaCA,
    cableCA: cableCA_AWG,
    // Voltaje del string (Voc para dimensionamiento)
    voltajeSistema: strings.vocString.toFixed(1),
  };
};
