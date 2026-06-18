// utils/engineering.ts
// Normas aplicadas:
//   NOM-001-SEDE-2012  Art. 690 — Sistemas Fotovoltaicos
//   NMX-J-680-ANCE-2014 — Instalaciones FV interconectadas
//   Factores de seguridad segun NOM-001 art. 690.8
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

// Temperatura minima de diseno para Mexico (invierno critico)
// Regiones frias: -10°C, regiones templadas: 0°C, costa/tropico: 10°C
// Se usa -10°C como caso conservador (peor escenario nacional)
const T_MIN_DISENO = -10;   // °C
const T_STC       = 25;    // °C  — Condiciones Estandar de Test

// Coeficiente de temperatura de Voc tipico paneles monocristalinos
// (si el fabricante no lo especifica, NOM recomienda usar -0.0029 /°C)
// En invierno (T < Tctc) el Voc SUBE: ΔV = Voc × |coef| × (Tstc - Tmin)
const COEF_TEMP_VOC = -0.0029;  // /°C  (-0.29%/°C tipico)

// Coeficiente de temperatura de Isc tipico
// En invierno el Isc sube ligeramente (+0.04%/°C aprox)
const COEF_TEMP_ISC = 0.0004;   // /°C

// Factores de seguridad NOM-001-SEDE-2012 art. 690.8
// Corriente maxima del circuito = Isc x 1.25  (factor de irradiancia)
// Conductor/fusible             = Isc x 1.25 x 1.25 = x 1.5625 ≈ 1.56
const FS_CORRIENTE_IRRADIANCIA = 1.25;  // sobrecarga por irradiancia
const FS_CONDUCTOR             = 1.25;  // NOM art. 310 uso continuo
const FS_TOTAL_CC              = FS_CORRIENTE_IRRADIANCIA * FS_CONDUCTOR; // 1.5625

// Margen de seguridad sobre voltaje maximo del inversor
// Se deja un 5% de colchon para no llegar exactamente al limite
const MARGEN_VOLTAJE = 0.95;

// ════════════════════════════════════════════════════════════════════════════
// CORRECCIONES DE TEMPERATURA
// ════════════════════════════════════════════════════════════════════════════

// Voc corregido a temperatura minima (caso critico para voltaje maximo)
// Voc_min = Voc_stc × [1 + COEF_VOC × (T_min - T_stc)]
// Como COEF_VOC es negativo y T_min < T_stc, el resultado es MAYOR que Voc_stc
const vocCorregidoInvierno = (voc: number): number =>
  voc * (1 + COEF_TEMP_VOC * (T_MIN_DISENO - T_STC));

// Isc corregido a temperatura minima
// Isc_min = Isc_stc × [1 + COEF_ISC × (T_min - T_stc)]
// El Isc baja un poco en frio, pero para seguridad usamos el STC en corriente
const iscCorregidoInvierno = (isc: number): number =>
  isc * (1 + COEF_TEMP_ISC * (T_MIN_DISENO - T_STC));

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ════════════════════════════════════════════════════════════════════════════
export interface ResultadoStrings {
  // Configuracion
  panelesPorString: number;       // paneles en serie por string
  stringsEnParalelo: number;      // strings en paralelo por MPPT (distribucion uniforme)
  stringsTotalSistema: number;    // strings totales en el sistema
  mpptUsados: number;             // MPPT del inversor que se utilizan
  // Parametros electricos con correccion de temperatura
  vocStringStc: number;           // Voc string a STC (25°C)
  vocStringInvierno: number;      // Voc string corregido a -10°C (caso critico)
  vmpString: number;              // Vmp del string (punto de trabajo)
  iscStringStc: number;           // Isc por string a STC
  corrienteEntradaMPPT: number;   // Isc total × strings en paralelo por MPPT
  corrienteDisenoCC: number;      // Corriente de diseno NOM (Isc × FS_TOTAL_CC)
  // Resumen por MPPT
  distribucionMPPT: { mppt: number; strings: number; paneles: number }[];
  // Validaciones
  vocDentroLimite: boolean;
  iscDentroLimite: boolean;
  mpptSuficientes: boolean;
  alertas: string[];              // mensajes de advertencia
  errores: string[];              // violaciones de norma (rojas)
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULO PRINCIPAL DE STRINGS
// ════════════════════════════════════════════════════════════════════════════
export const calcularArregloStrings = (
  panel: any,
  inversor: any,
  numPaneles: number
): ResultadoStrings => {
  const alertas: string[] = [];
  const errores: string[] = [];

  // ── 1. Voc corregido por temperatura (invierno critico) ──────────────────
  const vocPanelInvierno = vocCorregidoInvierno(panel.voc);
  const iscPanelInvierno = iscCorregidoInvierno(panel.isc);
  // Voltaje maximo efectivo del inversor con margen de seguridad
  const vMaxEfectivo = inversor.max_dc_volts * MARGEN_VOLTAJE;

  // ── 2. Maximos paneles en serie (limitado por Voc corregido invierno) ────
  // NOM-001 art. 690.7: Voc_string × 1.25 NO debe exceder clasificacion del equipo
  // En la practica: se usa Voc_invierno directamente con margen 5%
  const maxPanelesSerie = Math.floor(vMaxEfectivo / vocPanelInvierno);

  // Minimo paneles en serie: al menos 2 paneles, y Vmp_string >= ~80V (MPPT minimo tipico)
  const minPanelesSerie = Math.max(2, Math.ceil(80 / panel.vmp));

  if (maxPanelesSerie < minPanelesSerie) {
    errores.push(`Panel incompatible: max ${maxPanelesSerie} en serie pero minimo ${minPanelesSerie} para MPPT`);
  }

  // ── 3. Strings en paralelo maximos por MPPT (limitado por Isc_invierno) ──
  // NOM-001 art. 690.8: corriente de diseno = Isc × 1.56
  // La corriente total en el bus no debe superar imax_por_mppt del inversor
  // corriente_total = strings_paralelo × Isc_panel × FS_TOTAL_CC ≤ imax_por_mppt
  const maxStringsPorMPPT = Math.max(1,
    Math.floor(inversor.imax_por_mppt / (panel.isc * FS_TOTAL_CC))
  );

  // ── 4. Numero de strings totales ─────────────────────────────────────────
  // Usamos el maximo de paneles en serie para minimizar strings
  let panelesPorString = Math.min(maxPanelesSerie, numPaneles);
  if (panelesPorString < minPanelesSerie && maxPanelesSerie >= minPanelesSerie) {
    panelesPorString = minPanelesSerie;
  }
  const stringsTotalSistema = Math.ceil(numPaneles / panelesPorString);

  // ── 5. Distribucion equitativa entre MPPT disponibles ───────────────────
  // Principio: no sobrecargar un solo MPPT cuando hay varios disponibles.
  // Si el inversor tiene N MPPT y necesitamos S strings:
  //   - Repartir ceil(S/N) strings por MPPT
  //   - Verificar que ceil(S/N) <= maxStringsPorMPPT
  const mpptDisponibles = inversor.num_mppt;
  // MPPT necesarios para no superar corriente maxima por MPPT
  const mpptNecesariosCorreinte = Math.ceil(stringsTotalSistema / maxStringsPorMPPT);
  // Usamos TODOS los MPPT disponibles si hay strings suficientes (distribucion mas equilibrada)
  const mpptUsados = Math.min(
    Math.max(mpptNecesariosCorreinte, Math.min(mpptDisponibles, stringsTotalSistema)),
    mpptDisponibles
  );

  // Strings por MPPT (ceil para repartir de forma uniforme)
  const stringsEnParalelo = Math.ceil(stringsTotalSistema / mpptUsados);

  // ── 6. Distribucion detallada por MPPT ───────────────────────────────────
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

  // ── 7. Calculos electricos finales ────────────────────────────────────────
  const vocStringStc      = parseFloat((panelesPorString * panel.voc).toFixed(1));
  const vocStringInvierno = parseFloat((panelesPorString * vocPanelInvierno).toFixed(1));
  const vmpString         = parseFloat((panelesPorString * panel.vmp).toFixed(1));
  const iscStringStc      = parseFloat(panel.isc.toFixed(2));
  const corrienteEntradaMPPT = parseFloat((stringsEnParalelo * panel.isc).toFixed(2));
  const corrienteDisenoCC    = parseFloat((stringsEnParalelo * panel.isc * FS_TOTAL_CC).toFixed(2));

  // ── 8. Validaciones de norma ──────────────────────────────────────────────
  // Voltaje
  const vocDentroLimite = vocStringInvierno <= inversor.max_dc_volts;
  if (!vocDentroLimite) {
    errores.push(`❌ NOM-001 690.7: Voc invierno ${vocStringInvierno}V excede limite inversor ${inversor.max_dc_volts}V`);
  } else if (vocStringInvierno > inversor.max_dc_volts * 0.90) {
    alertas.push(`⚠️ Voc invierno ${vocStringInvierno}V esta al ${Math.round(vocStringInvierno/inversor.max_dc_volts*100)}% del limite`);
  }

  // Corriente
  const iscDentroLimite = corrienteDisenoCC <= inversor.imax_por_mppt;
  if (!iscDentroLimite) {
    errores.push(`❌ NOM-001 690.8: Corriente diseno ${corrienteDisenoCC}A excede MPPT max ${inversor.imax_por_mppt}A`);
  }

  // MPPT
  const mpptSuficientes = mpptNecesariosCorreinte <= mpptDisponibles;
  if (!mpptSuficientes) {
    errores.push(`❌ Se necesitan ${mpptNecesariosCorreinte} MPPT, inversor tiene ${mpptDisponibles}`);
  }

  // Sobredimensionado (recomendacion: max 30% sobre potencia AC del inversor)
  const potenciaDC = numPaneles * panel.pmax;
  const ratioDC_AC = potenciaDC / inversor.pmax_ac;
  if (ratioDC_AC > 1.30) {
    alertas.push(`⚠️ Sobredimensionado: ratio DC/AC = ${ratioDC_AC.toFixed(2)} (recomendado max 1.30 segun NMX-J-680)`);
  }

  return {
    panelesPorString,
    stringsEnParalelo,
    stringsTotalSistema,
    mpptUsados,
    vocStringStc,
    vocStringInvierno,
    vmpString,
    iscStringStc,
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
// Busca el inversor mas pequeno de la DB que cumple todas las restricciones
// ════════════════════════════════════════════════════════════════════════════
export const sugerirInversorCompatible = (
  panel: any,
  numPaneles: number,
  inversoresDB: any[],
  potenciaKW: number
): any[] => {
  // Retorna lista de inversores validos ordenados por potencia (menor primero)
  return inversoresDB
    .filter(inv => {
      const res = calcularArregloStrings(panel, inv, numPaneles);
      const potenciaW = potenciaKW * 1000;
      return (
        res.errores.length === 0 &&
        inv.max_dc_input >= potenciaW
      );
    })
    .sort((a, b) => a.max_dc_input - b.max_dc_input);
};

// ════════════════════════════════════════════════════════════════════════════
// PROTECCIONES ELECTRICAS  (NOM-001-SEDE-2012 art. 690.8 + art. 310)
// ════════════════════════════════════════════════════════════════════════════
export const calcularProtecciones = (panel: any, inversor: any, numPaneles: number) => {
  const strings = calcularArregloStrings(panel, inversor, numPaneles);

  // ── Lado CC (por string) ──────────────────────────────────────────────────
  // Corriente de diseno = Isc × 1.56  (NOM-001 art. 690.8)
  const iDisenoCC = panel.isc * FS_TOTAL_CC;
  // Fusible / interruptor: siguiente valor comercial sobre la corriente de diseno
  // Valores comerciales tipicos: 10, 15, 20, 25, 30, 35, 40A
  const fusiblesComerciales = [10, 15, 20, 25, 30, 35, 40, 50, 60];
  const fusibleRecomendadoCC = fusiblesComerciales.find(f => f >= iDisenoCC) || Math.ceil(iDisenoCC / 5) * 5;

  // Calibre de cable CC solar (THWN-2 o especial FV segun NOM)
  // Conductor 90°C, capacidad ampere segun tabla NOM
  let cableCC_AWG = "12 AWG (Solar)";
  if (iDisenoCC > 20) cableCC_AWG = "10 AWG (Solar)";
  if (iDisenoCC > 30) cableCC_AWG = "8 AWG (Solar)";

  // ── Lado CA ───────────────────────────────────────────────────────────────
  // Corriente de diseno CA = I_ac_nominal × 1.25  (uso continuo NOM art. 310)
  const iDisenoCA = inversor.i_max_ac * FS_CORRIENTE_IRRADIANCIA;
  const pastillaRecomendadaCA = fusiblesComerciales.find(f => f >= iDisenoCA) || Math.ceil(iDisenoCA / 5) * 5;

  let cableCA_AWG = "12 AWG THW-LS";
  if (iDisenoCA > 20) cableCA_AWG  = "10 AWG THW-LS";
  if (iDisenoCA > 30) cableCA_AWG  = "8 AWG THW-LS";
  if (iDisenoCA > 40) cableCA_AWG  = "6 AWG THW-LS";
  if (iDisenoCA > 60) cableCA_AWG  = "4 AWG THW-LS";
  if (iDisenoCA > 80) cableCA_AWG  = "3 AWG THW-LS";
  if (iDisenoCA > 100) cableCA_AWG = "2/0 AWG THW-LS";

  return {
    strings,
    fusibleCC: fusibleRecomendadoCC,
    cableCC: cableCC_AWG,
    iDisenoCC: parseFloat(iDisenoCC.toFixed(2)),
    pastillaCA: pastillaRecomendadaCA,
    cableCA: cableCA_AWG,
    iDisenoCA: parseFloat(iDisenoCA.toFixed(2)),
    voltajeSistema: strings.vocStringInvierno.toFixed(1),
  };
};
