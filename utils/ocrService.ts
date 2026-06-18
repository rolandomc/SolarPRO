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

    // Unir el texto de todas las páginas (por si el historial está en la página 2)
    const textoCompleto = data.ParsedResults.map((page: any) => page.ParsedText).join("\n");
    
    // 1. Extraer Cliente (Busca lo que sigue de Comisión Federal...)
    let cliente = "";
    const lineas = textoCompleto.split('\n');
    const indiceCFE = lineas.findIndex(l => l.toUpperCase().includes('FEDERAL DE ELECTRICIDAD'));
    if (indiceCFE !== -1 && lineas[indiceCFE + 1]) {
      cliente = lineas[indiceCFE + 1].trim(); // Generalmente la siguiente línea es el nombre
    }

    // 2. Extraer Historial de Consumos (6 bimestres)
    // CFE suele poner una tabla en la parte trasera. Buscamos bloques de números grandes sueltos
    // Este Regex busca el formato del historial tabular de CFE
    const regexHistorial = /(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{2}\s+(\d{1,5})/gi;
    let match;
    let lecturas = [];
    while ((match = regexHistorial.exec(textoCompleto)) !== null) {
      const lectura = parseInt(match[1].replace(/,/g, ''));
      if (lectura > 0 && lectura < 10000) lecturas.push(lectura); // Filtro lógico
    }

    let consumoPromedioMensual = 0;
    let mensaje = "";

    if (lecturas.length >= 2) {
      // Tomar las últimas 6 lecturas (1 año bimestral)
      const ultimas6 = lecturas.slice(0, 6);
      const sumaTotal = ultimas6.reduce((a, b) => a + b, 0);
      // Como son bimestres, la suma total se divide entre los meses (ej. 6 bimestres = 12 meses)
      consumoPromedioMensual = Math.round(sumaTotal / (ultimas6.length * 2));
      mensaje = `Promedio de ${ultimas6.length} bimestres detectados.`;
    } else {
      // Fallback: Buscar lectura única como antes
      const regexUnico = /Energ[ií]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
      const matchUnico = textoCompleto.match(regexUnico);
      if (matchUnico) {
        consumoPromedioMensual = Math.round(parseInt(matchUnico[1].replace(/,/g, '')) / 2); // Entre 2 meses
        mensaje = "Solo se detectó la última lectura. (Considera un error por estacionalidad).";
      }
    }

    return { 
      exito: true, 
      consumoPromedio: consumoPromedioMensual || null, 
      cliente: cliente,
      mensaje: mensaje,
      textoBruto: textoCompleto 
    };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};