// utils/pdfGenerator.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface ItemCotizacion { id: string; descripcion: string; cantidad: string; precio: string; }
export interface PerfilEmpresa { nombre: string; telefono: string; email: string; logoBase64: string; }

export interface RoiData {
  tarifa: string;
  precioKwh: number;
  potenciaKWp?: number;
  kwGeneradosMes: number;
  ahorroMensual: number;
  ahorroBimestral: number;
  ahorroAnual: number;
  roiMeses: number;
  roiAnos: string;
  ahorroTotal25: number;
  gananciaTotal25: number;
}

export interface IngData {
  numPaneles: number;
  potenciaKW: number;
  panel?: { marca: string; modelo: string; pmax: number; voc: number; isc: number; };
  inversor?: { marca: string; modelo: string; fases: 1 | 3; v_ac: number; num_mppt: number; imax_por_mppt: number; max_dc_input: number; max_dc_volts: number; };
  protecciones?: { iDisenoCC: number; fusibleCC: number; cableCC: string; iDisenoCA: number; pastillaCA: number; cableCA: string; };
  strings?: any;
  tipoConexion?: { tarifa: string; fases: 1 | 3; descripcion: string; voltajeAC: number; };
}

const esc = (v: any) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const generarDiagramaUnifilarSVG = (ing?: IngData | null, roi?: RoiData | null) => {
  if (!ing) return '';

  const s = ing.strings || {};
  const panelTxt = `${ing.numPaneles} paneles • ${ing.potenciaKW.toFixed(2)} kWp`;
  const strTxt = `${s.stringsEnParalelo || '-'} string(s) × ${s.panelesPorString || '-'} paneles`;
  const invTxt = `${ing.inversor?.marca || ''} ${ing.inversor?.modelo || ''}`.trim();
  const ccTxt = `Fusible CC ${ing.protecciones?.fusibleCC || '-'} A • ${esc(ing.protecciones?.cableCC || '-')}`;
  const caTxt = `Termomag. CA ${ing.protecciones?.pastillaCA || '-'} A • ${esc(ing.protecciones?.cableCA || '-')}`;
  const redTxt = `${ing.tipoConexion?.fases === 3 ? 'Red 3F' : 'Red 1F'} • ${ing.tipoConexion?.voltajeAC || '-'} V • Tarifa ${esc(ing.tipoConexion?.tarifa || '-')}`;
  const vocTxt = `Voc str: ${s.vocStringInvierno || s.vocStringStc || '-'} V`;
  const iscTxt = `Isc MPPT: ${s.corrienteEntradaMPPT || '-'} A`;
  const genTxt = roi ? `Gen. estimada: ${roi.kwGeneradosMes.toLocaleString()} kWh/mes` : '';

  return `
    <div style="page-break-before: always; margin-top: 20px;">
      <h2 style="color:#0F172A; margin:0 0 8px 0; font-size:22px;">Diagrama Unifilar</h2>
      <p style="margin:0 0 18px 0; color:#64748B; font-size:12px;">Esquema referencial del sistema fotovoltaico propuesto.</p>
      <svg width="100%" viewBox="0 0 1080 620" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
          </marker>
        </defs>

        <rect x="30" y="90" width="180" height="120" rx="14" fill="#FFF7ED" stroke="#F59E0B" stroke-width="3"/>
        <text x="120" y="125" text-anchor="middle" font-size="22" font-weight="bold" fill="#9A3412">Arreglo FV</text>
        <text x="120" y="155" text-anchor="middle" font-size="16" fill="#7C2D12">${esc(panelTxt)}</text>
        <text x="120" y="180" text-anchor="middle" font-size="15" fill="#7C2D12">${esc(strTxt)}</text>

        <rect x="260" y="90" width="190" height="120" rx="14" fill="#FDF2F8" stroke="#EC4899" stroke-width="3"/>
        <text x="355" y="125" text-anchor="middle" font-size="22" font-weight="bold" fill="#9D174D">Protección CC</text>
        <text x="355" y="155" text-anchor="middle" font-size="15" fill="#831843">${esc(ccTxt)}</text>
        <text x="355" y="180" text-anchor="middle" font-size="15" fill="#831843">${esc(vocTxt)}</text>

        <rect x="500" y="90" width="190" height="120" rx="14" fill="#EFF6FF" stroke="#0EA5E9" stroke-width="3"/>
        <text x="595" y="125" text-anchor="middle" font-size="22" font-weight="bold" fill="#075985">Inversor</text>
        <text x="595" y="155" text-anchor="middle" font-size="15" fill="#0C4A6E">${esc(invTxt)}</text>
        <text x="595" y="180" text-anchor="middle" font-size="15" fill="#0C4A6E">${esc(iscTxt)}</text>

        <rect x="740" y="90" width="180" height="120" rx="14" fill="#F0FDF4" stroke="#10B981" stroke-width="3"/>
        <text x="830" y="125" text-anchor="middle" font-size="22" font-weight="bold" fill="#065F46">Protección CA</text>
        <text x="830" y="155" text-anchor="middle" font-size="15" fill="#065F46">${esc(caTxt)}</text>
        <text x="830" y="180" text-anchor="middle" font-size="15" fill="#065F46">Salida ${esc(ing.inversor?.v_ac || '-')} V</text>

        <rect x="940" y="90" width="110" height="120" rx="14" fill="#F8FAFC" stroke="#64748B" stroke-width="3"/>
        <text x="995" y="125" text-anchor="middle" font-size="18" font-weight="bold" fill="#334155">Medidor</text>
        <text x="995" y="152" text-anchor="middle" font-size="15" fill="#475569">CFE</text>
        <text x="995" y="178" text-anchor="middle" font-size="13" fill="#475569">Bidirecc.</text>

        <rect x="820" y="330" width="230" height="120" rx="14" fill="#EEF2FF" stroke="#6366F1" stroke-width="3"/>
        <text x="935" y="365" text-anchor="middle" font-size="22" font-weight="bold" fill="#3730A3">Red / Carga</text>
        <text x="935" y="395" text-anchor="middle" font-size="15" fill="#4338CA">${esc(redTxt)}</text>
        <text x="935" y="420" text-anchor="middle" font-size="15" fill="#4338CA">${esc(genTxt)}</text>

        <line x1="210" y1="150" x2="260" y2="150" stroke="#334155" stroke-width="4" marker-end="url(#arrow)"/>
        <line x1="450" y1="150" x2="500" y2="150" stroke="#334155" stroke-width="4" marker-end="url(#arrow)"/>
        <line x1="690" y1="150" x2="740" y2="150" stroke="#334155" stroke-width="4" marker-end="url(#arrow)"/>
        <line x1="920" y1="150" x2="940" y2="150" stroke="#334155" stroke-width="4" marker-end="url(#arrow)"/>
        <line x1="995" y1="210" x2="995" y2="330" stroke="#334155" stroke-width="4"/>
        <line x1="995" y1="330" x2="935" y2="330" stroke="#334155" stroke-width="4" marker-end="url(#arrow)"/>

        <text x="535" y="255" font-size="18" font-weight="bold" fill="#0F172A">Datos técnicos principales</text>
        <rect x="150" y="275" width="770" height="220" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>

        <text x="185" y="320" font-size="16" fill="#334155">• Panel: ${esc(ing.panel?.marca || '')} ${esc(ing.panel?.modelo || '')} — ${esc(ing.panel?.pmax || '-')} W</text>
        <text x="185" y="355" font-size="16" fill="#334155">• Arreglo: ${esc(ing.numPaneles)} paneles = ${esc(ing.potenciaKW.toFixed(2))} kWp</text>
        <text x="185" y="390" font-size="16" fill="#334155">• Strings: ${esc(s.panelesPorString || '-')} paneles/string, ${esc(s.stringsEnParalelo || '-')} strings en paralelo, ${esc(s.mpptUsados || '-')} MPPT usados</text>
        <text x="185" y="425" font-size="16" fill="#334155">• Inversor: ${esc(invTxt)} — ${esc(ing.inversor?.num_mppt || '-')} MPPT, ${esc(ing.inversor?.imax_por_mppt || '-')} A/MPPT, Vmax ${esc(ing.inversor?.max_dc_volts || '-')} V</text>
        <text x="185" y="460" font-size="16" fill="#334155">• Protección CC: Fusible ${esc(ing.protecciones?.fusibleCC || '-')} A, conductor ${esc(ing.protecciones?.cableCC || '-')}</text>
        <text x="185" y="495" font-size="16" fill="#334155">• Protección CA: Termomagnético ${esc(ing.protecciones?.pastillaCA || '-')} A, conductor ${esc(ing.protecciones?.cableCA || '-')}</text>

        <text x="540" y="565" text-anchor="middle" font-size="12" fill="#64748B">Diagrama referencial para cotización técnica. Validar en sitio, memoria de cálculo final y cumplimiento NOM-001-SEDE vigente.</text>
      </svg>
    </div>
  `;
};

export const generarCotizacionProfesional = async (
  cliente: string,
  items: ItemCotizacion[],
  total: number,
  perfil: PerfilEmpresa | null,
  roi?: RoiData | null,
  ing?: IngData | null,
) => {
  const filasHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #475569;">${esc(item.cantidad)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-weight: 500;">${esc(item.descripcion)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">$${parseFloat(item.precio).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: bold;">$${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</td>
    </tr>
  `).join('');

  const logoHTML = perfil?.logoBase64
    ? `<img src="${perfil.logoBase64}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`
    : `<h2 style="color: #0EA5E9; margin: 0; font-size: 28px;">SolarCalc Pro</h2>`;

  const infoEmpresaHTML = perfil ? `
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">${esc(perfil.nombre)}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">Tel: ${esc(perfil.telefono)}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">${esc(perfil.email)}</p>
  ` : `<p style="margin: 4px 0; color: #64748B;">Instalador Independiente</p>`;

  const roiHTML = roi ? `
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <div style="background: linear-gradient(135deg, #064E3B 0%, #065F46 100%); border-radius: 12px; padding: 28px; color: white;">
        <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #6EE7B7; letter-spacing: 0.5px;">Análisis de Retorno de Inversión</h2>
        <p style="margin: 0 0 22px 0; font-size: 12px; color: #A7F3D0;">
          Tarifa CFE: <b>${esc(roi.tarifa)}</b> &nbsp;•&nbsp;
          Precio kWh: <b>$${roi.precioKwh}</b> &nbsp;•&nbsp;
          Generación estimada: <b>${roi.kwGeneradosMes.toLocaleString()} kWh/mes</b> &nbsp;•&nbsp;
          Factor de rendimiento: <b>PR = 80%</b>
        </p>
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 20px;">
          <tr>
            <td style="width: 32%; text-align: center; background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro mensual</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">$${roi.ahorroMensual.toLocaleString()}</div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / mes</div>
            </td>
            <td style="width: 32%; text-align: center; background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro bimestral</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">$${roi.ahorroBimestral.toLocaleString()}</div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / bimestre</div>
            </td>
            <td style="width: 32%; text-align: center; background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro anual</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">$${roi.ahorroAnual.toLocaleString()}</div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / año</div>
            </td>
          </tr>
        </table>
        <div style="background: rgba(14,165,233,0.22); border: 1.5px solid #38BDF8; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 13px; color: #BAE6FD; margin-bottom: 6px;">Recuperas tu inversión en</div>
          <div style="font-size: 48px; font-weight: bold; color: #FFFFFF; line-height: 1.1;">${roi.roiMeses} meses</div>
          <div style="font-size: 16px; color: #BAE6FD; margin-top: 4px;">(${esc(roi.roiAnos)} años)</div>
        </div>
        <div style="background: rgba(0,0,0,0.22); border-radius: 10px; padding: 18px;">
          <div style="font-size: 13px; color: #A7F3D0; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Proyección a 25 años — vida útil de los paneles</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 7px 0; font-size: 13px; color: #D1FAE5;">Ahorro total generado</td><td style="text-align: right; font-weight: bold; font-size: 16px; color: #FFFFFF;">$${roi.ahorroTotal25.toLocaleString()}</td></tr>
            <tr><td style="padding: 7px 0; font-size: 13px; color: #D1FAE5;">Inversión inicial</td><td style="text-align: right; font-weight: bold; font-size: 16px; color: #FCA5A5;">− $${total.toLocaleString()}</td></tr>
            <tr style="border-top: 1px solid rgba(255,255,255,0.18);"><td style="padding: 10px 0 4px; font-size: 16px; font-weight: bold; color: #6EE7B7;">Ganancia neta</td><td style="text-align: right; font-weight: bold; font-size: 24px; padding-top: 10px; color: ${roi.gananciaTotal25 >= 0 ? '#6EE7B7' : '#FCA5A5'};">$${roi.gananciaTotal25.toLocaleString()}</td></tr>
          </table>
        </div>
      </div>
    </div>
  ` : '';

  const diagramaHTML = generarDiagramaUnifilarSVG(ing, roi);

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0EA5E9; padding-bottom: 20px; margin-bottom: 30px; }
          .client-box { background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10B981; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background-color: #0F172A; color: white; padding: 14px 12px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #E2E8F0; text-align: right; }
          .total-box { display: inline-block; background-color: #F0FDF4; border: 1px solid #10B981; padding: 15px 30px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>${logoHTML}</div>
          <div style="text-align: right;">
            <h1 style="color: #0F172A; margin: 0 0 10px 0; font-size: 24px;">COTIZACIÓN TÉCNICA</h1>
            ${infoEmpresaHTML}
            <p style="margin: 10px 0 0 0; color: #94A3B8; font-size: 12px;">Fecha: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="client-box">
          <h3 style="margin: 0 0 5px 0; color: #0F172A; font-size: 16px;">Preparado exclusivamente para:</h3>
          <h2 style="margin: 0; color: #0EA5E9; font-size: 22px;">${esc(cliente)}</h2>
        </div>

        <table>
          <tr>
            <th style="text-align: center; border-radius: 6px 0 0 0;">Cant.</th>
            <th style="text-align: left;">Descripción del Componente</th>
            <th style="text-align: right;">Precio Unit.</th>
            <th style="text-align: right; border-radius: 0 6px 0 0;">Subtotal</th>
          </tr>
          ${filasHTML}
        </table>

        <div class="footer">
          <div class="total-box">
            <h3 style="margin: 0; color: #475569; font-size: 16px;">Inversión Total Estimada</h3>
            <h1 style="margin: 5px 0 0 0; color: #10B981; font-size: 32px;">$${total.toFixed(2)}</h1>
          </div>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 20px;">* Esta cotización está sujeta a cambios y validación técnica en sitio.</p>
        </div>

        ${roiHTML}
        ${diagramaHTML}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};
