// utils/ocrService.ts

interface Bimestre {
  periodo: string;
  kwh: number;
}

// Limpia el nombre del cliente: quita RFC, números largos y texto basura
const limpiarNombreCliente = (raw: string): string => {
  if (!raw) return "";
  // Eliminar RFC (patrón alfanumérico de 12-13 chars con guión)
  let nombre = raw.replace(/[A-Z]{3,4}\d{6}[A-Z0-9]{3}/gi, "");
  // Eliminar líneas con palabras clave que no son nombres
  const palabrasBasura = ["RFC", "TARIFA", "MEDIDOR", "CUENTA", "SERVICIO", "CFE", "LIMITE", "PAGO", "CORTE"];
  for (const palabra of palabrasBasura) {
    if (nombre.toUpperCase().includes(palabra)) return "";
  }
  // Limpiar espacios y caracteres extraños
  nombre = nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").trim();
  // Validar que tenga al menos 2 palabras (nombre + apellido)
  const palabras = nombre.split(/\s+/).filter(p => p.length > 1);
  if (palabras.length < 2) return "";
  return palabras.join(" ");
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

    // 1. Extraer y limpiar nombre del cliente
    let cliente = "";
    // Buscar todas las líneas después de "FEDERAL DE ELECTRICIDAD" y tomar la primera válida
    const indiceCFE = lineas.findIndex((l: string) => l.toUpperCase().includes("FEDERAL DE ELECTRICIDAD"));
    if (indiceCFE !== -1) {
      for (let i = indiceCFE + 1; i < Math.min(indiceCFE + 5, lineas.length); i++) {
        const candidato = limpiarNombreCliente(lineas[i]);
        if (candidato.length > 4) { cliente = candidato; break; }
      }
    }

    // 2. Historial de consumos — formato CFE real:
    // "del 05 DIC 25 al 05 FEB 26  683  $1,879.00"
    const regexHistorialCFE = /del\s+(\d{1,2}\s+\w+\s+\d{2})\s+al\s+(\d{1,2}\s+\w+\s+\d{2})\s+([\d,]+)\s+\$/gi;
    let matchH;
    const bimestres: Bimestre[] = [];

    while ((matchH = regexHistorialCFE.exec(textoCompleto)) !== null) {
      const kwh = parseInt(matchH[3].replace(/,/g, ""), 10);
      if (kwh >= 50 && kwh <= 9999) {
        bimestres.push({
          periodo: `${matchH[1].trim()} - ${matchH[2].trim()}`,
          kwh,
        });
      }
    }

    let consumo: string | null = null;
    let mensaje = "";

    if (bimestres.length >= 2) {
      const ultimos = bimestres.slice(0, Math.min(bimestres.length, 6));
      const suma = ultimos.reduce((a, b) => a + b.kwh, 0);
      const promedioMensual = Math.round(suma / (ultimos.length * 2));
      consumo = String(promedioMensual);
      mensaje = `Promedio de ${ultimos.length} bimestres detectados`;
    } else {
      // Fallback: tabla de energía del periodo
      const regexEnergiaPeriodo = /Energ[i\u00ed]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
      const matchEnergia = textoCompleto.match(regexEnergiaPeriodo);
      if (matchEnergia) {
        const consumoBimestral = parseInt(matchEnergia[1].replace(/,/g, ""), 10);
        consumo = String(Math.round(consumoBimestral / 2));
        mensaje = "Lectura del periodo actual (estimacion bimestral / 2)";
      } else {
        const regexPeriodoTotal = /Total\s+periodo[^\d]*([\d,]+)\s*kWh/i;
        const matchTotal = textoCompleto.match(regexPeriodoTotal);
        if (matchTotal) {
          const consumoBimestral = parseInt(matchTotal[1].replace(/,/g, ""), 10);
          consumo = String(Math.round(consumoBimestral / 2));
          mensaje = "Consumo extraido del total del periodo";
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
      textoBruto: textoCompleto,
    };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};
