// utils/ocrService.ts
//
// Tarifas CFE Mexico y su tipo de conexion electrica:
//
//  RESIDENCIAL / DOMESTICA:
//    1  -> Basica monofasica     120V  L1-N
//    1A -> Media tension         120V  L1-N
//    DAC -> Domest. Alto Consumo  Los recibos dicen "DAC" o "TARIFA 1" o "DOM"
//         En Mexico residencial el suministro es BIFASICO (220V L1-L2-N)
//         pero el inversor es MONOFASICO (conecta entre L1-L2 = 220V)
//
//  GENERAL / COMERCIAL:
//    2   -> Baja tension monofasico 120/220V
//    3   -> Baja tension trifasico  220V (industria pequena)
//    OM  -> Mediana tension trifasico 220/440V
//    HM  -> Media tension industrial 3F
//
// CONCLUSION PARA EL DIMENSIONADOR:
//   Tarifa 1, 1A, DAC, 2 -> MONOFASICO (fases=1)
//   Tarifa 3, OM, HM, MT -> TRIFASICO  (fases=3)

interface Bimestre {
  periodo: string;
  kwh: number;
}

export type TipoConexion = {
  tarifa: string;         // ej: "DAC", "1", "3", "HM"
  fases: 1 | 3;          // 1 = monofasico, 3 = trifasico
  descripcion: string;   // texto legible para el usuario
  voltajeAC: 220 | 380;  // voltaje de salida inversor requerido
};

const TARIFAS_TRIFASICAS = ['HM', 'HS', 'HT', 'OM', 'O', '3', 'MT', 'AT', 'EAT'];
const TARIFAS_MONOFASICAS = ['1', '1A', '1B', '1C', 'DAC', '2', 'DOMESTICA', 'DOM', 'RESIDENCIAL'];

const detectarTipoConexion = (textoCompleto: string): TipoConexion => {
  const texto = textoCompleto.toUpperCase();

  // Buscar patron "TARIFA: XXX" o "TARIFA XXX" en el recibo
  const matchTarifa = texto.match(
    /TARIFA[:\s]+([A-Z0-9]+)/
  );
  const tarifaDetectada = matchTarifa ? matchTarifa[1].trim() : '';

  // Tambien buscar si aparece directamente "DAC" o "HM" etc en el texto
  let tarifaFinal = tarifaDetectada;
  if (!tarifaFinal) {
    for (const t of [...TARIFAS_TRIFASICAS, ...TARIFAS_MONOFASICAS]) {
      // Buscar como palabra completa (con espacios o puntuacion alrededor)
      const re = new RegExp(`(?<![A-Z0-9])${t}(?![A-Z0-9])`);
      if (re.test(texto)) {
        tarifaFinal = t;
        break;
      }
    }
  }

  const esTrifasico = TARIFAS_TRIFASICAS.some(t => tarifaFinal.startsWith(t));

  if (esTrifasico) {
    return {
      tarifa: tarifaFinal || 'Industrial',
      fases: 3,
      descripcion: `Trifasico (${tarifaFinal}) — 380V L1-L2-L3-N`,
      voltajeAC: 380,
    };
  }

  // Residencial / domestico Mexico: bifasico 220V (L1-L2-N)
  // El inversor se conecta entre L1 y L2 = 220V (monofasico)
  return {
    tarifa: tarifaFinal || 'Residencial',
    fases: 1,
    descripcion: `Residencial (${tarifaFinal || 'DOM'}) — 220V bifasico L1-L2-N`,
    voltajeAC: 220,
  };
};

const extraerNombreDeLinea = (linea: string): string => {
  if (!linea || linea.trim().length === 0) return '';
  const stopWords = [
    'TOTAL', 'PAGAR', 'RFC', 'TARIFA', 'MEDIDOR', 'CUENTA',
    'SERVICIO', 'LIMITE', 'CORTE', 'FRACC', 'BISELA',
    'COL ', ' AV ', 'CALLE', 'KWH', 'DESCARGA',
    'PERIODO', 'IMPORTE', 'BIMEST', '$',
  ];
  let texto = linea.trim();
  let corteMasProximo = texto.length;
  for (const stop of stopWords) {
    const idx = texto.toUpperCase().indexOf(stop);
    if (idx > 0 && idx < corteMasProximo) corteMasProximo = idx;
  }
  texto = texto.substring(0, corteMasProximo).trim();
  texto = texto.replace(/[A-Z]{3,4}\d{6}[A-Z0-9]{2,3}/gi, '');
  texto = texto.replace(/[^a-zA-Z\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\s]/g, '').trim();
  texto = texto.replace(/\s{2,}/g, ' ').trim();
  const palabras = texto.split(/\s+/).filter(p => p.length > 1);
  if (palabras.length < 2) return '';
  return palabras.slice(0, 5).join(' ');
};

export const procesarDocumentoOCR = async (fileUri: string, fileName: string, mimeType: string) => {
  try {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    formData.append('language', 'spa');
    formData.append('apikey', 'helloworld');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = await response.json();
    if (data.IsErroredOnProcessing || !data.ParsedResults) throw new Error('Documento ilegible.');

    const textoCompleto = data.ParsedResults.map((page: any) => page.ParsedText).join('\n');
    const lineas = textoCompleto.split('\n');

    // ── 1. Nombre del cliente ──────────────────────────────────────────────
    let cliente = '';
    const indicesCFE: number[] = [];
    lineas.forEach((l: string, i: number) => {
      if (l.toUpperCase().includes('FEDERAL DE ELECTRICIDAD')) indicesCFE.push(i);
    });
    const indiceCFE = indicesCFE.length >= 2 ? indicesCFE[1] : (indicesCFE.length === 1 ? indicesCFE[0] : -1);
    if (indiceCFE !== -1) {
      for (let i = indiceCFE + 1; i < Math.min(indiceCFE + 6, lineas.length); i++) {
        const candidato = extraerNombreDeLinea(lineas[i]);
        if (candidato.length > 4) { cliente = candidato; break; }
      }
    }

    // ── 2. Tipo de conexion (tarifa / fases) ───────────────────────────────
    const tipoConexion: TipoConexion = detectarTipoConexion(textoCompleto);

    // ── 3. Historial bimestral CFE ─────────────────────────────────────────
    const regexHistorialCFE = /del\s+(\d{1,2}\s+\w+\s+\d{2})\s+al\s+(\d{1,2}\s+\w+\s+\d{2})\s+([\d,]+)\s+\$/gi;
    let matchH;
    const bimestres: Bimestre[] = [];
    while ((matchH = regexHistorialCFE.exec(textoCompleto)) !== null) {
      const kwh = parseInt(matchH[3].replace(/,/g, ''), 10);
      if (kwh >= 50 && kwh <= 9999) {
        bimestres.push({ periodo: `${matchH[1].trim()} - ${matchH[2].trim()}`, kwh });
      }
    }

    let consumo: string | null = null;
    let mensaje = '';
    if (bimestres.length >= 2) {
      const ultimos = bimestres.slice(0, Math.min(bimestres.length, 6));
      const suma = ultimos.reduce((a, b) => a + b.kwh, 0);
      consumo = String(Math.round(suma / (ultimos.length * 2)));
      mensaje = `Promedio de ${ultimos.length} bimestres detectados`;
    } else {
      const regexEnergiaPeriodo = /Energ[i\u00ed]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
      const matchEnergia = textoCompleto.match(regexEnergiaPeriodo);
      if (matchEnergia) {
        consumo = String(Math.round(parseInt(matchEnergia[1].replace(/,/g, ''), 10) / 2));
        mensaje = 'Lectura del periodo actual';
      } else {
        const regexPeriodoTotal = /Total\s+periodo[^\d]*([\d,]+)\s*kWh/i;
        const matchTotal = textoCompleto.match(regexPeriodoTotal);
        if (matchTotal) {
          consumo = String(Math.round(parseInt(matchTotal[1].replace(/,/g, ''), 10) / 2));
          mensaje = 'Consumo extraido del total del periodo';
        }
      }
    }

    return {
      exito: true,
      consumo,
      consumoPromedio: consumo ? parseInt(consumo) : null,
      cliente,
      mensaje,
      bimestres,
      tipoConexion,       // NUEVO: tarifa, fases, descripcion, voltajeAC
      textoBruto: textoCompleto,
    };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};
