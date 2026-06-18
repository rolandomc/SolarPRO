// data/componentsDB.ts
export const PANELES_DB = [
  { id: "p1", marca: "Canadian Solar", modelo: "HiKu6 550W", pmax: 550, voc: 49.6, isc: 14.0, vmp: 41.7, imp: 13.2 },
  { id: "p2", marca: "Jinko Solar", modelo: "Tiger Pro 540W", pmax: 540, voc: 49.5, isc: 13.9, vmp: 40.7, imp: 13.27 },
  { id: "p3", marca: "Trina Solar", modelo: "Vertex 600W", pmax: 600, voc: 41.7, isc: 18.4, vmp: 34.4, imp: 17.4 },
];

export const INVERSORES_DB = [
  { id: "i1", marca: "Solis", modelo: "1P5K-4G (5kW)", pmax_ac: 5000, max_dc_input: 6000, max_dc_volts: 600, v_ac: 220, fases: 2, i_max_ac: 22.7 },
  { id: "i2", marca: "Growatt", modelo: "MIN 3000TL-X", pmax_ac: 3000, max_dc_input: 4200, max_dc_volts: 500, v_ac: 220, fases: 2, i_max_ac: 13.6 },
  { id: "i3", marca: "Huawei", modelo: "SUN2000-10KTL-M1", pmax_ac: 10000, max_dc_input: 15000, max_dc_volts: 1000, v_ac: 380, fases: 3, i_max_ac: 15.2 },
];