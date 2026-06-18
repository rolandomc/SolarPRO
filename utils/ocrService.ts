// utils/ocrService.ts

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

    // 1. Extraer nombre del cliente
    let cliente = "";
    const lineas = textoCompleto.split("\n");
    const indiceCFE = lineas.findIndex(l => l.toUpperCase().includes("FEDERAL DE ELECTRICIDAD"));
    if (indiceCFE !== -1 && lineas[indiceCFE + 1]) {
      cliente = lineas[indiceCFE + 1].trim();
    }

    // 2. Extraer historial de consumos - formato CFE real:
    // "del 05 DIC 25 al 05 FEB 26  683  $1,879.00  $1,879.00"
    const regexHistorialCFE = /del\s+\d{1,2}\s+\w+\s+\d{2}\s+al\s+\d{1,2}\s+\w+\s+\d{2}\s+([\d,]+)\s+\$/gi;
    let matchH;
    const consumosBimestrales: number[] = [];
    while ((matchH = regexHistorialCFE.exec(textoCompleto)) !== null) {
      const kWh = parseInt(matchH[1].replace(/,/g, ""), 10);
      // Filtro: valores razonables entre 50 y 9999 kWh bimestrales
      if (kWh >= 50 && kWh <= 9999) consumosBimestrales.push(kWh);
    }

    let consumo: string | null = null;
    let mensaje = "";

    if (consumosBimestrales.length >= 2) {
      // Promediar los ultimos bimestres y dividir entre 2 para obtener mensual
      const ultimos = consumosBimestrales.slice(0, Math.min(consumosBimestrales.length, 6));
      const suma = ultimos.reduce((a, b) => a + b, 0);
      const promedioMensual = Math.round(suma / (ultimos.length * 2));
      consumo = String(promedioMensual);
      mensaje = `Promedio de ${ultimos.length} bimestres detectados.`;
    } else {
      // Fallback 1: Leer consumo del periodo actual desde la tabla de energia
      // Formato: "Energia (kWh)   15,370   14,439   931"
      const regexEnergiaPeriodo = /Energ[i\u00ed]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
      const matchEnergia = textoCompleto.match(regexEnergiaPeriodo);
      if (matchEnergia) {
        const consumoBimestral = parseInt(matchEnergia[1].replace(/,/g, ""), 10);
        consumo = String(Math.round(consumoBimestral / 2));
        mensaje = "Solo se detecto el ultimo periodo. (Considera un error por estacionalidad).";
      } else {
        // Fallback 2: Buscar el total del periodo directamente
        const regexPeriodoTotal = /Total\s+periodo[^\d]*([\d,]+)\s*kWh/i;
        const matchTotal = textoCompleto.match(regexPeriodoTotal);
        if (matchTotal) {
          const consumoBimestral = parseInt(matchTotal[1].replace(/,/g, ""), 10);
          consumo = String(Math.round(consumoBimestral / 2));
          mensaje = "Consumo extraido del total del periodo.";
        }
      }
    }

    return {
      exito: true,
      consumo,           // nombre correcto que espera index.tsx
      consumoPromedio: consumo ? parseInt(consumo) : null,  // compatibilidad
      cliente,
      mensaje,
      textoBruto: textoCompleto,
    };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};
