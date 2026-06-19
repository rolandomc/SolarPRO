// data/componentsDB.ts
// Precios en MXN (referencia 2026, varían por distribuidor ~±15%)
//
// FUENTES INVERSORES GROWATT:
//   MIN TL-X  — datasheet Growatt MIN 2500-6000TL-X (original)
//   MIN TL-X2 — datasheet Growatt MIN 2500-6000TL-X2 (2022)
//   DIFERENCIAS TL-X vs TL-X2:
//     imax_por_mppt: 12.5A → 16A  |  Start voltage: 80V → 50V
//
// FUENTES INVERSORES FRONIUS:
//   Fronius Primo / Symo — datasheet rev. 2024
//   https://www.fronius.com/en/solar-energy/installers-partners/products/all-products/inverters
//
// FUENTES INVERSORES SOLAREDGE:
//   SE serie HD-Wave — datasheet SolarEdge 2024
//   https://www.solaredge.com/en/products/residential/solar-inverters
//
// PANELES: datasheets oficiales + precios distribuidores MX 2026

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

// ═══════════════════════════════════════════════════════════════════
//  PANELES SOLARES
// ═══════════════════════════════════════════════════════════════════
const PANELES_DB: Panel[] = [

  // ─── Canadian Solar ────────────────────────────────────────────
  { id: "p1",  marca: "Canadian Solar", modelo: "HiKu6 CS6W-550MS",      pmax: 550, voc: 49.6, isc: 14.00, vmp: 41.7, imp: 13.20, precio_mxn: 3200 },
  { id: "p2",  marca: "Canadian Solar", modelo: "HiKu7 CS7N-655MS",      pmax: 655, voc: 53.2, isc: 15.70, vmp: 44.2, imp: 14.82, precio_mxn: 3900 },
  { id: "p3",  marca: "Canadian Solar", modelo: "BiHiKu6 CS6W-545MB",    pmax: 545, voc: 49.3, isc: 13.90, vmp: 41.2, imp: 13.23, precio_mxn: 3500 },
  { id: "p16", marca: "Canadian Solar", modelo: "HiKu6 CS6W-500MS",      pmax: 500, voc: 47.1, isc: 13.45, vmp: 39.6, imp: 12.63, precio_mxn: 2950 },
  { id: "p17", marca: "Canadian Solar", modelo: "TOPHiKu6 CS6W-580T",    pmax: 580, voc: 49.8, isc: 14.72, vmp: 41.8, imp: 13.88, precio_mxn: 3600 },
  { id: "p18", marca: "Canadian Solar", modelo: "HiKu7 CS7N-700MS",      pmax: 700, voc: 54.8, isc: 16.24, vmp: 46.0, imp: 15.22, precio_mxn: 4300 },

  // ─── JA Solar ──────────────────────────────────────────────────
  { id: "p12", marca: "JA Solar",       modelo: "JAM72S30 545W",         pmax: 545, voc: 49.9, isc: 13.80, vmp: 41.8, imp: 13.04, precio_mxn: 3050 },
  { id: "p13", marca: "JA Solar",       modelo: "JAM54S30 415W",         pmax: 415, voc: 41.9, isc: 12.60, vmp: 35.0, imp: 11.86, precio_mxn: 2500 },
  { id: "p19", marca: "JA Solar",       modelo: "JAM72D40 580W",         pmax: 580, voc: 52.6, isc: 14.17, vmp: 43.9, imp: 13.21, precio_mxn: 3350 },
  { id: "p20", marca: "JA Solar",       modelo: "JAM66D45 615W N-type",  pmax: 615, voc: 52.2, isc: 15.05, vmp: 43.5, imp: 14.14, precio_mxn: 3700 },
  { id: "p21", marca: "JA Solar",       modelo: "JAM54D40 435W",         pmax: 435, voc: 43.1, isc: 12.87, vmp: 36.2, imp: 12.02, precio_mxn: 2650 },
  { id: "p22", marca: "JA Solar",       modelo: "JAM72S30 565W",         pmax: 565, voc: 50.5, isc: 14.22, vmp: 42.3, imp: 13.36, precio_mxn: 3150 },

  // ─── Jinko Solar ───────────────────────────────────────────────
  { id: "p4",  marca: "Jinko Solar",    modelo: "Tiger Neo N-type 580W", pmax: 580, voc: 53.0, isc: 13.90, vmp: 44.6, imp: 13.01, precio_mxn: 3400 },
  { id: "p5",  marca: "Jinko Solar",    modelo: "Tiger Pro 540W",        pmax: 540, voc: 49.5, isc: 13.90, vmp: 40.7, imp: 13.27, precio_mxn: 3100 },
  { id: "p6",  marca: "Jinko Solar",    modelo: "Eagle G4 400W",         pmax: 400, voc: 41.3, isc: 12.40, vmp: 34.4, imp: 11.63, precio_mxn: 2400 },
  { id: "p23", marca: "Jinko Solar",    modelo: "Tiger Neo N-type 610W", pmax: 610, voc: 53.9, isc: 14.52, vmp: 45.5, imp: 13.41, precio_mxn: 3650 },
  { id: "p24", marca: "Jinko Solar",    modelo: "Tiger Neo N-type 635W", pmax: 635, voc: 55.5, isc: 14.64, vmp: 46.6, imp: 13.63, precio_mxn: 3850 },

  // ─── Trina Solar ───────────────────────────────────────────────
  { id: "p7",  marca: "Trina Solar",    modelo: "Vertex S+ 440W",        pmax: 440, voc: 41.8, isc: 13.40, vmp: 34.5, imp: 12.76, precio_mxn: 2700 },
  { id: "p8",  marca: "Trina Solar",    modelo: "Vertex 600W",           pmax: 600, voc: 41.7, isc: 18.40, vmp: 34.4, imp: 17.40, precio_mxn: 3600 },
  { id: "p9",  marca: "Trina Solar",    modelo: "Vertex N 720W",         pmax: 720, voc: 56.3, isc: 16.20, vmp: 47.0, imp: 15.32, precio_mxn: 4500 },
  { id: "p25", marca: "Trina Solar",    modelo: "Vertex S+ 460W N-type", pmax: 460, voc: 43.0, isc: 13.62, vmp: 36.0, imp: 12.78, precio_mxn: 2900 },

  // ─── LONGi Solar ───────────────────────────────────────────────
  { id: "p10", marca: "LONGi Solar",    modelo: "Hi-MO 6 580W",          pmax: 580, voc: 52.7, isc: 13.98, vmp: 44.3, imp: 13.10, precio_mxn: 3500 },
  { id: "p11", marca: "LONGi Solar",    modelo: "Hi-MO 5 530W",          pmax: 530, voc: 49.8, isc: 13.50, vmp: 41.8, imp: 12.68, precio_mxn: 3200 },
  { id: "p26", marca: "LONGi Solar",    modelo: "Hi-MO X6 615W",         pmax: 615, voc: 53.3, isc: 14.72, vmp: 44.7, imp: 13.76, precio_mxn: 3750 },
  { id: "p27", marca: "LONGi Solar",    modelo: "Hi-MO 6 Explorer 590W", pmax: 590, voc: 52.9, isc: 14.20, vmp: 44.5, imp: 13.27, precio_mxn: 3600 },

  // ─── SunPower ──────────────────────────────────────────────────
  { id: "p14", marca: "SunPower",       modelo: "Maxeon 3 400W",         pmax: 400, voc: 47.1, isc: 10.70, vmp: 40.0, imp: 10.00, precio_mxn: 5200 },
  { id: "p28", marca: "SunPower",       modelo: "Maxeon 6 440W",         pmax: 440, voc: 48.6, isc: 11.47, vmp: 41.3, imp: 10.66, precio_mxn: 6100 },

  // ─── Risen Energy ──────────────────────────────────────────────
  { id: "p15", marca: "Risen Energy",   modelo: "RSM110-8 550W",         pmax: 550, voc: 49.7, isc: 14.00, vmp: 41.5, imp: 13.24, precio_mxn: 2800 },
  { id: "p29", marca: "Risen Energy",   modelo: "RSM132-8 660W",         pmax: 660, voc: 53.6, isc: 15.64, vmp: 45.0, imp: 14.67, precio_mxn: 3800 },
];

// ═══════════════════════════════════════════════════════════════════
//  INVERSORES
// ═══════════════════════════════════════════════════════════════════
const INVERSORES_DB: Inversor[] = [

  // ────────────────────────────────────────────────────────────────
  // Growatt MIN TL-X  (monofásico 220V, serie original)
  // imax_por_mppt: 12.5A  |  Vmax DC: 550V  |  2 MPPT
  // ────────────────────────────────────────────────────────────────
  { id:"g1",  marca:"Growatt", modelo:"MIN 1500TL-X",     pmax_ac:  1500, max_dc_input:  2250, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac:  6.8, num_mppt:1, imax_por_mppt:12.5, precio_mxn:  8500 },
  { id:"g2",  marca:"Growatt", modelo:"MIN 2000TL-X",     pmax_ac:  2000, max_dc_input:  3000, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac:  9.1, num_mppt:1, imax_por_mppt:12.5, precio_mxn:  9200 },
  { id:"g3",  marca:"Growatt", modelo:"MIN 3000TL-X",     pmax_ac:  3000, max_dc_input:  4500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 10500 },
  { id:"g4",  marca:"Growatt", modelo:"MIN 4200TL-X",     pmax_ac:  4200, max_dc_input:  5880, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 19.1, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 12800 },
  { id:"g5",  marca:"Growatt", modelo:"MIN 5000TL-X",     pmax_ac:  5000, max_dc_input:  6500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 14500 },
  { id:"g6",  marca:"Growatt", modelo:"MIN 6000TL-X",     pmax_ac:  6000, max_dc_input:  7800, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 16800 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MIN TL-X2  (monofásico 220V, 2022)
  // imax_por_mppt: 16A  |  Vmax DC: 550V  |  Start: 50V  |  2 MPPT
  // Fuentes: conermex.com.mx, enertik.com/mx, syscom.mx
  // ────────────────────────────────────────────────────────────────
  { id:"x1",  marca:"Growatt", modelo:"MIN 2500TL-X2",    pmax_ac:  2500, max_dc_input:  3750, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 11.3, num_mppt:2, imax_por_mppt:16.0, precio_mxn:  9500 },
  { id:"x2",  marca:"Growatt", modelo:"MIN 3000TL-X2",    pmax_ac:  3000, max_dc_input:  4500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 10800 },
  { id:"x3",  marca:"Growatt", modelo:"MIN 3600TL-X2",    pmax_ac:  3600, max_dc_input:  5400, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 16.0, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 11900 },
  { id:"x4",  marca:"Growatt", modelo:"MIN 4200TL-X2",    pmax_ac:  4200, max_dc_input:  6300, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 19.0, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 13500 },
  { id:"x5",  marca:"Growatt", modelo:"MIN 5000TL-X2",    pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 15200 },
  { id:"x6",  marca:"Growatt", modelo:"MIN 6000TL-X2",    pmax_ac:  6000, max_dc_input:  9000, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 27.2, num_mppt:2, imax_por_mppt:16.0, precio_mxn: 17500 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MOD  (trifásico 380V)
  // ────────────────────────────────────────────────────────────────
  { id:"g7",  marca:"Growatt", modelo:"MOD 5000TL3-X",    pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac:  7.6, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 18500 },
  { id:"g8",  marca:"Growatt", modelo:"MOD 8000TL3-X",    pmax_ac:  8000, max_dc_input: 12000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 12.2, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 22000 },
  { id:"g9",  marca:"Growatt", modelo:"MOD 10KTL3-X",     pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 26500 },
  { id:"g10", marca:"Growatt", modelo:"MOD 15KTL3-X",     pmax_ac: 15000, max_dc_input: 22500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 22.8, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 34000 },
  { id:"g11", marca:"Growatt", modelo:"MOD 20KTL3-X",     pmax_ac: 20000, max_dc_input: 30000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 30.4, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 42000 },
  { id:"g12", marca:"Growatt", modelo:"MOD 25KTL3-X",     pmax_ac: 25000, max_dc_input: 37500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 38.0, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 52000 },
  { id:"g13", marca:"Growatt", modelo:"MOD 30KTL3-X",     pmax_ac: 30000, max_dc_input: 45000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 45.6, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 61000 },

  // ────────────────────────────────────────────────────────────────
  // Growatt MAX  (industrial trifásico 380V)
  // ────────────────────────────────────────────────────────────────
  { id:"g14", marca:"Growatt", modelo:"MAX 50KTL3 LV",    pmax_ac:  50000, max_dc_input:  75000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac:  72.4, num_mppt: 6, imax_por_mppt:25.0, precio_mxn:  95000 },
  { id:"g15", marca:"Growatt", modelo:"MAX 80KTL3 LV",    pmax_ac:  80000, max_dc_input: 120000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac: 115.9, num_mppt: 8, imax_por_mppt:25.0, precio_mxn: 145000 },
  { id:"g16", marca:"Growatt", modelo:"MAX 100KTL3 LV",   pmax_ac: 100000, max_dc_input: 150000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac: 144.9, num_mppt:10, imax_por_mppt:25.0, precio_mxn: 175000 },

  // ────────────────────────────────────────────────────────────────
  // Growatt SPH  (híbrido con batería, monofásico)
  // ────────────────────────────────────────────────────────────────
  { id:"g17", marca:"Growatt", modelo:"SPH 3000TL BL-UP", pmax_ac:  3000, max_dc_input:  4500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  22000 },
  { id:"g18", marca:"Growatt", modelo:"SPH 5000TL BL-UP", pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  28000 },
  { id:"g19", marca:"Growatt", modelo:"SPH 6000TL BL-UP", pmax_ac:  6000, max_dc_input:  9000, max_dc_volts: 550, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn:  32000 },

  // ────────────────────────────────────────────────────────────────
  // Fronius Primo  (monofásico 240V, datasheet 2024)
  // Vmax DC: 600V  |  Rango MPPT: 80–600V  |  2 MPPT
  // Fuente: fronius.com datasheet Primo 3.0-15.0
  // ────────────────────────────────────────────────────────────────
  { id:"f1",  marca:"Fronius", modelo:"Primo 3.0-1",      pmax_ac:  3000, max_dc_input:  4500, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 13.6, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 14500 },
  { id:"f2",  marca:"Fronius", modelo:"Primo 3.6-1",      pmax_ac:  3600, max_dc_input:  5400, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 16.4, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 16200 },
  { id:"f3",  marca:"Fronius", modelo:"Primo 5.0-1",      pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 20500 },
  { id:"f4",  marca:"Fronius", modelo:"Primo 6.0-1",      pmax_ac:  6000, max_dc_input:  9000, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 23800 },
  { id:"f5",  marca:"Fronius", modelo:"Primo 8.2-1",      pmax_ac:  8200, max_dc_input: 12300, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 37.3, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 30000 },
  { id:"f6",  marca:"Fronius", modelo:"Primo 10.0-1",     pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 45.5, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 35500 },
  { id:"f7",  marca:"Fronius", modelo:"Primo 15.0-1",     pmax_ac: 15000, max_dc_input: 22500, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 68.2, num_mppt:2, imax_por_mppt:18.0, precio_mxn: 48000 },

  // ────────────────────────────────────────────────────────────────
  // Fronius Symo  (trifásico 380V, datasheet 2024)
  // Vmax DC: 800V  |  Rango MPPT: 200–800V  |  2 MPPT
  // ────────────────────────────────────────────────────────────────
  { id:"f8",  marca:"Fronius", modelo:"Symo 5.0-3-M",    pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac:  7.6, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 22000 },
  { id:"f9",  marca:"Fronius", modelo:"Symo 8.2-3-M",    pmax_ac:  8200, max_dc_input: 12300, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 12.5, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 28500 },
  { id:"f10", marca:"Fronius", modelo:"Symo 10.0-3-M",   pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:2, imax_por_mppt:12.0, precio_mxn: 33000 },
  { id:"f11", marca:"Fronius", modelo:"Symo 15.0-3-M",   pmax_ac: 15000, max_dc_input: 22500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 22.8, num_mppt:2, imax_por_mppt:18.0, precio_mxn: 45000 },
  { id:"f12", marca:"Fronius", modelo:"Symo 20.0-3-M",   pmax_ac: 20000, max_dc_input: 30000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 30.4, num_mppt:3, imax_por_mppt:18.0, precio_mxn: 57000 },
  { id:"f13", marca:"Fronius", modelo:"Symo 24.0-3-M",   pmax_ac: 24000, max_dc_input: 36000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 36.5, num_mppt:3, imax_por_mppt:18.0, precio_mxn: 67000 },

  // ────────────────────────────────────────────────────────────────
  // SolarEdge HD-Wave  (monofásico 240V, datasheet 2024)
  // Vmax DC: 480V  |  1 MPPT (optimizadores por panel)
  // Nota: requiere optimizadores P370/P404/P505 por panel
  // imax_por_mppt alto porque los optimizadores gestionan individualmente
  // ────────────────────────────────────────────────────────────────
  { id:"se1", marca:"SolarEdge", modelo:"SE3500H HD-Wave",  pmax_ac:  3500, max_dc_input:  5250, max_dc_volts: 480, v_ac:220, fases:1, i_max_ac: 16.0, num_mppt:1, imax_por_mppt:13.5, precio_mxn: 18500 },
  { id:"se2", marca:"SolarEdge", modelo:"SE5000H HD-Wave",  pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 480, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:1, imax_por_mppt:13.5, precio_mxn: 23000 },
  { id:"se3", marca:"SolarEdge", modelo:"SE6000H HD-Wave",  pmax_ac:  6000, max_dc_input:  9750, max_dc_volts: 480, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:1, imax_por_mppt:13.5, precio_mxn: 27500 },
  { id:"se4", marca:"SolarEdge", modelo:"SE7600H HD-Wave",  pmax_ac:  7600, max_dc_input: 11400, max_dc_volts: 480, v_ac:220, fases:1, i_max_ac: 34.5, num_mppt:1, imax_por_mppt:13.5, precio_mxn: 31000 },
  { id:"se5", marca:"SolarEdge", modelo:"SE10000H HD-Wave", pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 480, v_ac:220, fases:1, i_max_ac: 45.5, num_mppt:1, imax_por_mppt:13.5, precio_mxn: 39000 },

  // ────────────────────────────────────────────────────────────────
  // SolarEdge Three Phase  (trifásico 380V, SE serie comercial)
  // ────────────────────────────────────────────────────────────────
  { id:"se6", marca:"SolarEdge", modelo:"SE10K RWS",         pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:2, imax_por_mppt:13.5, precio_mxn: 42000 },
  { id:"se7", marca:"SolarEdge", modelo:"SE17K RWS",         pmax_ac: 17000, max_dc_input: 25500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 25.8, num_mppt:3, imax_por_mppt:13.5, precio_mxn: 62000 },
  { id:"se8", marca:"SolarEdge", modelo:"SE25K RWS",         pmax_ac: 25000, max_dc_input: 37500, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 38.0, num_mppt:4, imax_por_mppt:13.5, precio_mxn: 85000 },

  // ────────────────────────────────────────────────────────────────
  // Otras marcas
  // ────────────────────────────────────────────────────────────────
  { id:"o1",  marca:"Solis",   modelo:"1P5K-4G (5kW)",     pmax_ac:  5000, max_dc_input:  6000, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 22.7, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 13500 },
  { id:"o2",  marca:"Solis",   modelo:"S6-GR1P6K (6kW)",   pmax_ac:  6000, max_dc_input:  7800, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:12.5, precio_mxn: 15800 },
  { id:"o3",  marca:"Huawei",  modelo:"SUN2000-5KTL-L1",   pmax_ac:  5000, max_dc_input:  6500, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 23.0, num_mppt:2, imax_por_mppt:13.5, precio_mxn: 17500 },
  { id:"o4",  marca:"Huawei",  modelo:"SUN2000-10KTL-M1",  pmax_ac: 10000, max_dc_input: 15000, max_dc_volts:1000, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:3, imax_por_mppt:15.0, precio_mxn: 32000 },
  { id:"o5",  marca:"SMA",     modelo:"Sunny Boy 5.0",     pmax_ac:  5000, max_dc_input:  7500, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 22.0, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 19000 },
  { id:"o6",  marca:"SMA",     modelo:"Sunny Boy 6.0",     pmax_ac:  6000, max_dc_input:  9000, max_dc_volts: 600, v_ac:220, fases:1, i_max_ac: 27.3, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 22500 },
  { id:"o7",  marca:"SMA",     modelo:"Sunny Tripower 10.0",pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 800, v_ac:380, fases:3, i_max_ac: 15.2, num_mppt:2, imax_por_mppt:15.0, precio_mxn: 35000 },
];

export { PANELES_DB, INVERSORES_DB };
export type { Panel, Inversor };
