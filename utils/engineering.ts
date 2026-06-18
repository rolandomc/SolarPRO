// utils/engineering.ts
import * as Location from 'expo-location';

// Función para obtener las Horas de Sol Pico (HSP) desde la API de la NASA
export const obtenerHSPDesdeNasa = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permiso de GPS denegado');

    let location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;

    // API de NASA POWER (Climatology)
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Extraemos el promedio anual (ANN) de radiación solar
    const hspAnual = data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;

    return { exito: true, hsp: hspAnual, lat, lon };
  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};

// Función para calcular las protecciones basadas en la NOM (Norma Oficial Mexicana / NEC)
export const calcularProtecciones = (panel: any, inversor: any, numPaneles: number) => {
  // --- Lado CC (Corriente Continua) ---
  // Fusible CC = Isc * 1.56 (Factor de seguridad estándar)
  const corrienteCCMax = panel.isc * 1.56;
  const fusibleRecomendadoCC = Math.ceil(corrienteCCMax / 5) * 5; // Redondear a múltiplos de 5A
  const cableCC_AWG = fusibleRecomendadoCC > 20 ? "10 AWG" : "12 AWG (Solar)";

  // --- Lado CA (Corriente Alterna) ---
  // Pastilla CA = Corriente nominal CA del inversor * 1.25 (Uso continuo)
  const corrienteCAMax = inversor.i_max_ac * 1.25;
  const pastillaRecomendadaCA = Math.ceil(corrienteCAMax / 5) * 5;
  
  let cableCA_AWG = "12 AWG";
  if (pastillaRecomendadaCA > 20) cableCA_AWG = "10 AWG";
  if (pastillaRecomendadaCA > 30) cableCA_AWG = "8 AWG";
  if (pastillaRecomendadaCA > 40) cableCA_AWG = "6 AWG";

  return {
    fusibleCC: fusibleRecomendadoCC,
    cableCC: cableCC_AWG,
    pastillaCA: pastillaRecomendadaCA,
    cableCA: cableCA_AWG,
    voltajeSistema: (panel.voc * numPaneles).toFixed(2),
  };
};