// data/componentsDB.ts
// Precios en MXN (referencia 2025, varían por distribuidor ~±15%)
//
// FUENTES DE DATOS INVERSORES:
//   MIN TL-X  — datasheet Growatt MIN 2500-6000TL-X (original)
//   MIN TL-X2 — datasheet Growatt MIN 2500-6000TL-X2 (2022)
//              https://xlstore.exelsolar.com/Multimedia/FichaTecnica/GRW-MIN-6000TL-X2_FichaTecnica.pdf
//              https://www.conermex.com.mx/hojas-tecnicas/inversores-ongrid/GROWATT-MIN3.6k-6k.pdf
//
// DIFERENCIAS TL-X vs TL-X2:
//   imax_por_mppt: 12.5A  →  16A
//   max_dc_volts:  550V   →  550V  (igual)
//   max_dc_input:  ×1.3 aprox sobre pmax_ac (ver hoja de datos por modelo)
//   Start voltage: 50V (X2) vs 80V (X)
//   Voc cortocircuito max por MPPT: 24A (X2)

export interface Panel {
  id: string; marca: string; modelo: string; pmax: number;
  voc: number; isc: number; vmp: number; imp: number;
  precio_mxn: number;
}

export interface Inversor {
  id: string; marca: string; modelo: string;
  pmax_ac: number;        // W salida AC nominal
  max_dc_input: number;   // W entrada DC maxima total (todos los MPPT)
  max_dc_volts: number;   // V maximo en entrada DC (limite de string)
  v_ac: number;           // V salida AC
  fases: number;          // 1 = monofasico, 3 = trifasico
  i_max_ac: number;       // A maxima salida AC
  num_mppt: number;       // cantidad de trackers MPPT
  imax_por_mppt: number;  // A maximos REALES por MPPT (corriente fisica de entrada)
  precio_mxn: number;
}

// ───────────────────────────────────────────────────────────────────
const PANELES_DB: Panel[] = [
  // Canadian Solar
  { id: "p1",  marca: "Canadian Solar", modelo: "HiKu6 CS6W-550MS",    pmax: 550, voc: 49.6, isc: 14.0, vmp: 41.7, imp: 13.20, precio_mxn: 3200 },
  { id: "p2",  marca: "Canadian Solar", modelo: "HiKu7 CS7N-655MS",    pmax: 655, voc: 53.2, isc: 15.7, vmp: 44.2, imp: 14.82, precio_mxn: 3900 },
  { id: "p3",  marca: "Canadian Solar", modelo: "BiHiKu6 CS6W-545MB",  pmax: 545, voc: 49.3, isc: 13.9, vmp: 41.2, imp: 13.23, precio_mxn: 3500 },
  // Jinko Solar
  { id: "p4",  marca: "Jinko Solar",    modelo: "Tiger Neo N-type 580W",pmax: 580, voc: 53.0, isc: 13.9, vmp: 44.6, imp: 13.01, precio_mxn: 3400 },
  { id: "p5",  marca: "Jinko Solar",    modelo: "Tiger Pro 540W",       pmax: 540, voc: 49.5, isc: 13.9, vmp: 40.7, imp: 13.27, precio_mxn: 3100 },
  { id: "p6",  marca: "Jinko Solar",    modelo: "Eagle G4 400W",        pmax: 400, voc: 41.3, isc: 12.4, vmp: 34.4, imp: 11.63, precio_mxn: 2400 },
  // Trina Solar
  { id: "p7",  marca: "Trina Solar",    modelo: "Vertex S+ 440W",       pmax: 440, voc: 41.8, isc: 13.4, vmp: 34.5, imp: 12.76, precio_mxn: 2700 },
  { id: "p8",  marca: "Trina Solar",    modelo: "Vertex 600W",          pmax: 600, voc: 41.7, isc: 18.4, vmp: 34.4, imp: 17.40, precio_mxn: 3600 },
  { id: "p9",  marca: "Trina Solar",    modelo: "Vertex N 720W",        pmax: 720, voc: 56.3, isc: 16.2, vmp: 47.0, imp: 15.32, precio_mxn: 4500 },
  // LONGi Solar
  { id: "p10", marca: "LONGi Solar",    modelo: "Hi-MO 6 580W",         pmax: 580, voc: 52.7, isc: 13.98,vmp: 44.3, imp: 13.10, precio_mxn: 3500 },
  { id: "p11", marca: "LONGi Solar",    modelo: "Hi-MO 5 530W",         pmax: 530, voc: 49.8, isc: 13.5, vmp: 41.8, imp: 12.68, precio_mxn: 3200 },
  // JA Solar
  { id: "p12", marca: "JA Solar",       modelo: "JAM72S30 545W",        pmax: 545, voc: 49.9, isc: 13.8, vmp: 41.8, imp: 13.04, precio_mxn: 3050 },
  { id: "p13", marca: "JA Solar",       modelo: "JAM54S30 415W",        pmax: 415, voc: 41.9, isc: 12.6, vmp: 35.0, imp: 11.86, precio_mxn: 2500 },
  // SunPower
  { id: "p14", marca: "SunPower",       modelo: "Maxeon 3 400W",        pmax: 400, voc: 47.1, isc: 10.7, vmp: 40.0, imp: 10.00, precio_mxn: 5200 },
  // Risen Energy
  { id: "p15", marca: "Risen Energy",   modelo: "RSM110-8 550W",        pmax: 550, voc: 49.7, isc: 14.0, vmp: 41.5, imp: 13.24, precio_mxn: 2800 },
];

// ───────────────────────────────────────────────────────────────────
const INVERSORES_DB: Inversor[] = [

  // ────────────────────────────────────────────────────────────────
  // Growatt MIN TL-X  (serie original, monofásico 220V)
  // imax_por_mppt: 12.5A  |  Vmax DC: 550V  |  2 MPPT
  // Fuente: datasheet MIN 2500-6000TL-X (rev. original)
  // ────────────────────────────────────────────────────────────────
  { id:"g1",  marca:"Growatt", modelo:"MIN 1500TL-X",    pmax_ac:  1500, max_dc_input:  2250, max_dc_volts:550, v_ac:220, fases:1, i_max_ac:  6.8, num_mppt:1, imax_por_mppt:12.5, precio_mxn:  8500 },
  { id:"g2",  marca:"Growatt", modelo:"MIN 2000TL-X",    pmax_ac:  2000, max_dc_input:  3000, max_dc_volts:550, v_ac:220, fases:1, i_max_ac:  9.1, num_mppt:1, imax_por_mppt:12.5, precio_mxn:  9200 },
  { id:"g3",  marca:"Growatt", modelo:"MIN 3000TL-X",    pmax_ac:  3000, max_dc_input:  4500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 10500 },
  { id:"g4",  marca:"Growatt", modelo:"MIN 4200TL-X",    pmax_ac:  4200, max_dc_input:  5880, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 19.1, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 12800 },
  { id:"g5",  marca:"Growatt", modelo:"MIN 5000TL-X",    pmax_ac:  5000, max_dc_input:  6500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 14500 },
  { id:"g6",  marca:"Growatt", modelo:"MIN 6000TL-X",    pmax_ac:  6000, max_dc_input:  7800, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 16800 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MIN TL-X2  (monofásico, DATOS REALES DE DATASHEET 2022)
  //
  // Todos los modelos:
  //   Vmax DC:         550 V
  //   Rango MPPT:      40 – 550 V
  //   Voltaje nominal: 360 V
  //   Start voltage:   50 V
  //   MPPT:            2 (modelos 2500-5000), 2 (modelo 6000)
  //   imax_por_mppt:   16 A  (corriente fisica maxima por MPPT)
  //   Isc max MPPT:    24 A  (cortocircuito, para fusible de back-feed)
  //   Salida AC:       220 V monofasico, 50/60 Hz
  //
  // max_dc_input por modelo (datasheet MIN 2500-6000TL-X2):
  //   2500W  →  3750 W  (150% pmax_ac)
  //   3000W  →  4500 W  (150%)
  //   3600W  →  5400 W  (150%)
  //   4200W  →  6300 W  (150%)
  //   5000W  →  7500 W  (150%)
  //   6000W  →  9000 W  (150%)
  //
  // i_max_ac por modelo (hoja de datos, columnas de corriente salida):
  //   2500W → 11.3A | 3000W → 13.6A | 3600W → 16.0A
  //   4200W → 19.0A | 5000W → 22.7A | 6000W → 27.2A
  //
  // Fuentes:
  //   conermex.com.mx MIN3.6k-6k hoja tecnica
  //   enertik.com/mx MIN 6000TL-X2
  //   syscom.mx MIN6000TLX2
  // ────────────────────────────────────────────────────────────────
  { id:"x1",  marca:"Growatt", modelo:"MIN 2500TL-X2",   pmax_ac:  2500, max_dc_input:  3750, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 11.3, num_mppt:2, imax_por_mppt:16.0, precio_mxn:  9500 },
  { id:"x2",  marca:"Growatt", modelo:"MIN 3000TL-X2",   pmax_ac:  3000, max_dc_input:  4500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 10800 },
  { id:"x3",  marca:"Growatt", modelo:"MIN 3600TL-X2",   pmax_ac:  3600, max_dc_input:  5400, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 16.0, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 11900 },
  { id:"x4",  marca:"Growatt", modelo:"MIN 4200TL-X2",   pmax_ac:  4200, max_dc_input:  6300, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 19.0, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 13500 },
  { id:"x5",  marca:"Growatt", modelo:"MIN 5000TL-X2",   pmax_ac:  5000, max_dc_input:  7500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 15200 },
  { id:"x6",  marca:"Growatt", modelo:"MIN 6000TL-X2",   pmax_ac:  6000, max_dc_input:  9000, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 27.2, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 17500 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MOD  (trifásico, 380V)
  // ────────────────────────────────────────────────────────────────
  { id:"g7",  marca:"Growatt", modelo:"MOD 5000TL3-X",   pmax_ac:  5000, max_dc_input:  7500, max_dc_volts:800, v_ac:380, fases:3, i_max_ac:  7.6, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 18500 },
  { id:"g8",  marca:"Growatt", modelo:"MOD 8000TL3-X",   pmax_ac:  8000, max_dc_input: 12000, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 12.2, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 22000 },
  { id:"g9",  marca:"Growatt", modelo:"MOD 10KTL3-X",    pmax_ac: 10000, max_dc_input: 15000, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 26500 },
  { id:"g10", marca:"Growatt", modelo:"MOD 15KTL3-X",    pmax_ac: 15000, max_dc_input: 22500, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 22.8, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 34000 },
  { id:"g11", marca:"Growatt", modelo:"MOD 20KTL3-X",    pmax_ac: 20000, max_dc_input: 30000, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 30.4, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 42000 },
  { id:"g12", marca:"Growatt", modelo:"MOD 25KTL3-X",    pmax_ac: 25000, max_dc_input: 37500, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 38.0, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 52000 },
  { id:"g13", marca:"Growatt", modelo:"MOD 30KTL3-X",    pmax_ac: 30000, max_dc_input: 45000, max_dc_volts:800, v_ac:380, fases:3, i_max_ac: 45.6, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 61000 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MAX  (industrial trifásico, 380V)
  // ────────────────────────────────────────────────────────────────
  { id:"g14", marca:"Growatt", modelo:"MAX 50KTL3 LV",   pmax_ac: 50000, max_dc_input: 75000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac:  72.4, num_mppt: 6, imax_por_mppt:25.0, precio_mxn:  95000 },
  { id:"g15", marca:"Growatt", modelo:"MAX 80KTL3 LV",   pmax_ac: 80000, max_dc_input:120000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac: 115.9, num_mppt: 8, imax_por_mppt:25.0, precio_mxn: 145000 },
  { id:"g16", marca:"Growatt", modelo:"MAX 100KTL3 LV",  pmax_ac:100000, max_dc_input:150000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac: 144.9, num_mppt:10, imax_por_mppt:25.0, precio_mxn: 175000 },

  // ────────────────────────────────────────────────────────────────
  // Growatt SPH  (híbrido con batería, monofásico)
  // ────────────────────────────────────────────────────────────────
  { id:"g17", marca:"Growatt", modelo:"SPH 3000TL BL-UP",pmax_ac:  3000, max_dc_input:  4500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  22000 },
  { id:"g18", marca:"Growatt", modelo:"SPH 5000TL BL-UP",pmax_ac:  5000, max_dc_input:  7500, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  28000 },
  { id:"g19", marca:"Growatt", modelo:"SPH 6000TL BL-UP",pmax_ac:  6000, max_dc_input:  9000, max_dc_volts:550, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  32000 },

  // ────────────────────────────────────────────────────────────────
  // Otras marcas
  // ────────────────────────────────────────────────────────────────
  { id:"o1",  marca:"Solis",   modelo:"1P5K-4G (5kW)",    pmax_ac:  5000, max_dc_input:  6000, max_dc_volts:600, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 13500 },
  { id:"o2",  marca:"Solis",   modelo:"S6-GR1P6K (6kW)",  pmax_ac:  6000, max_dc_input:  7800, max_dc_volts:600, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 15800 },
  { id:"o3",  marca:"Huawei",  modelo:"SUN2000-5KTL-L1",  pmax_ac:  5000, max_dc_input:  6500, max_dc_volts:600, v_ac:220, fases:1, i_max_ac: 23.0, num_mppt:2, imax_por_mppt:13.5, precio_mxn: 17500 },
  { id:"o4",  marca:"Huawei",  modelo:"SUN2000-10KTL-M1", pmax_ac: 10000, max_dc_input: 15000, max_dc_volts:1000,v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 32000 },
  { id:"o5",  marca:"SMA",     modelo:"Sunny Boy 5.0",    pmax_ac:  5000, max_dc_input:  7500, max_dc_volts:600, v_ac:220, fases:1, i_max_ac: 22.0, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 19000 },
];

export { PANELES_DB, INVERSORES_DB };
export type { Panel, Inversor };
