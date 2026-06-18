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
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing || !data.ParsedResults) {
      throw new Error("El documento no pudo ser procesado o es ilegible.");
    }

    const textoExtraido = data.ParsedResults[0]?.ParsedText || "";
    let consumoDetectado = null;

    // Patrón específico para el formato tabular de CFE: "Energía (kWh) 15,370 14,439 931"
    const regexCFE = /Energ[ií]a\s*\(kWh\)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i;
    const matchCFE = textoExtraido.match(regexCFE);

    if (matchCFE && matchCFE[1]) {
      consumoDetectado = matchCFE[1].replace(/,/g, ''); // Limpiar comas si las hay
    } else {
      // Patrones de respaldo
      const patrones = [
        /(\d{2,5})\s*(?:kwh|k\.w\.h)/i,             
        /\(kWh\)\s*(\d{2,5})/i,                     
      ];
      for (const regex of patrones) {
        const match = textoExtraido.match(regex);
        if (match && match[1]) {
          const posibleConsumo = parseInt(match[1]);
          if (posibleConsumo > 0 && posibleConsumo !== 2024 && posibleConsumo !== 2025 && posibleConsumo !== 2026) {
            consumoDetectado = match[1];
            break;
          }
        }
      }
    }

    return { 
      exito: true, 
      consumo: consumoDetectado, 
      textoBruto: textoExtraido 
    };

  } catch (error) {
    return { exito: false, error: (error as Error).message };
  }
};