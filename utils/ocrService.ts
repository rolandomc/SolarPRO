// utils/ocrService.ts

interface Bimestre {
  periodo: string;
  kwh: number;
}

// Extrae el nombre limpio de una linea que puede contener basura despues
// Ej: "VILLEGAS RODRIGUEZ DELIA MARIA  TOTAL A PAGAR:" -> "VILLEGAS RODRIGUEZ DELIA MARIA"
const extraerNombreDeLinea = (linea: string): string => {
  if (!linea || linea.trim().length === 0) return "";

  // Palabras que indican el fin del nombre en la misma linea
  const stopWords = [
    "TOTAL", "PAGAR", "RFC", "TARIFA", "MEDIDOR", "CUENTA",
    "SERVICIO", "LIMITE", "CORTE", "FRACC", "BISELA",
    "COL ", " AV ", "CALLE", "KWH", "DESCARGA",
    "PERIODO", "IMPORTE", "BIMEST", "$",
  ];

  let texto = linea.trim();

  // Cortar en la primera stopWord encontrada (la mas proxima al inicio)
  let corteMasProximo = texto.length;
  for (const stop of stopWords) {
    const idx = texto.toUpperCase().indexOf(stop);
    if (idx > 0 && idx < corteMasProximo) {
      corteMasProximo = idx;
    }
  }
  texto = texto.substring(0, corteMasProximo).trim();

  // Eliminar RFC (patron: 3-4 mayusculas + 6 digitos + 2-3 alfanumericos)
  texto = texto.replace(/[A-Z]{3,4}\d{6}[A-Z0-9]{2,3}/gi, "");

  // Solo letras y espacios (incluye acentos y enye)
  texto = texto.replace(/[^a-zA-Z\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\s]/g, "").trim();

  // Limpiar espacios multiples
  texto = texto.replace(/\s{2,}/g, " ").trim();

  // Validar: minimo 2 palabras (nombre + apellido) y cada palabra > 1 caracter
  const palabras = texto.split(/\s+/).filter(p => p.length > 1);
  if (palabras.length < 2) return "";

  // Maximo 5 palabras
  return palabras.slice(0, 5).join(" ");
};

export const procesarDocumentoOCR = async (fileUri: string, fileName: string, mimeType: string) => {
  try {
    const formData = new FormData();
    formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
    formData.append("language", "spa");
    formData.append("apikey", "helloworld");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");
    formData.append("scale", "true");
    formData.append("isTable", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST", body: formData, headers: { "Content-Type": "multipart/form-data" },
    });

    const data = await response.json();
    if (data.IsErroredOnProcessing || !data.ParsedResults) throw new Error("Documento ilegible.");

    const textoCompleto = data.ParsedResults.map((page: any) => page.ParsedText).join("\n");
    const lineas = textoCompleto.split("\n");

    // ── 1. Nombre del cliente ───────────────────────────────────────────────
    // El nombre aparece en la linea SIGUIENTE a "Comision Federal de Electricidad"
    // pero puede venir junto con "TOTAL A PAGAR:" en la misma linea.
    let cliente = "";

    // Buscar linea que contenga "FEDERAL DE ELECTRICIDAD" (puede aparecer 2 veces, tomar la 2da)
    const indicesCFE: number[] = [];
    lineas.forEach((l: string, i: number) => {
      if (l.toUpperCase().includes("FEDERAL DE ELECTRICIDAD")) indicesCFE.push(i);
    });

    // Preferir el segundo bloque (el del encabezado del cliente, no el pie)
    const indiceCFE = indicesCFE.length >= 2 ? indicesCFE[1] : (indicesCFE.length === 1 ? indicesCFE[0] : -1);

    if (indiceCFE !== -1) {
      for (let i = indiceCFE + 1; i < Math.min(indiceCFE + 6, lineas.length); i++) {
        const candidato = extraerNombreDeLinea(lineas[i]);
        if (candidato.length > 4) {
          cliente = candidato;
          break;
        }
      }
    }

    // ── 2. Historial bimestral CFE ──────────────────────────────────────────
    // Formato: "del 05 DIC 25 al 05 FEB 26  683  $1,879.00"
    const regexHistorialCFE = /del\s+(\d{1,2}\s+\w+\s+\d{2})\s+al\s+(\d{1,2}\s+\w+\s+\d{2})\s+([\d,]+)\s+\$/gi;
    let matchH;
    const bimestres: Bimestre[] = [];

    while ((matchH = regexHistorialCFE.exec(textoCompleto)) !== null) {
      const kwh = parseInt(matchH[3].replace(/,/g, ""), 10);
      if (kwh >= 50 && kwh <= 9999) {
        bimestres.push({ periodo: `${matchH[1].trim()} - ${matchH[2].trim()}`, kwh });
      }
    }

    let consumo: string | null = null;
    let mensaje = "";

    if (bimestres.length >= 2) {
      const ultimos = bimestres.slice(0, Math.min(bimestres.length, 6));
      const suma = ultimos.reduce((a, b) => a + b.kwh, 0);
      consumo = String(Math.round(suma / (ultimos.length * 2)));
      mensaje = `Promedio de ${ultimos.length} bimestres detectados`;
    } else {
      const regexEnergiaPeriodo = /Energ[i\u00ed]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
      const matchEnergia = textoCompleto.match(regexEnergiaPeriodo);
      if (matchEnergia) {
        consumo = String(Math.round(parseInt(matchEnergia[1].replace(/,/g, ""), 10) / 2));
        mensaje = "Lectura del periodo actual";
      } else {
        const regexPeriodoTotal = /Total\s+periodo[^\d]*([\d,]+)\s*kWh/i;
        const matchTotal = textoCompleto.match(regexPeriodoTotal);
        if (matchTotal) {
          consumo = String(Math.round(parseInt(matchTotal[1].replace(/,/g, ""), 10) / 2));
          mensaje = "Consumo extraido del total del periodo";
        }
      }
    }

    return { exito: true, consumo, consumoPromedio: consumo ? parseInt(consumo) : null, cliente, mensaje, bimestres, textoBruto: textoCompleto };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};
