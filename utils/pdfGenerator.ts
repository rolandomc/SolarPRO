// utils/pdfGenerator.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface ItemCotizacion { id: string; descripcion: string; cantidad: string; precio: string; }
export interface PerfilEmpresa { nombre: string; telefono: string; email: string; logoBase64: string; }

export interface RoiData {
  tarifa: string;
  precioKwh: number;
  kwGeneradosMes: number;
  ahorroMensual: number;
  ahorroBimestral: number;
  ahorroAnual: number;
  roiMeses: number;
  roiAnos: string;
  ahorroTotal25: number;
  gananciaTotal25: number;
}

export const generarCotizacionProfesional = async (
  cliente: string,
  items: ItemCotizacion[],
  total: number,
  perfil: PerfilEmpresa | null,
  roi?: RoiData | null,
) => {
  const filasHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #475569;">${item.cantidad}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-weight: 500;">${item.descripcion}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">$${parseFloat(item.precio).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: bold;">$${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</td>
    </tr>
  `).join('');

  const logoHTML = perfil?.logoBase64
    ? `<img src="${perfil.logoBase64}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`
    : `<h2 style="color: #0EA5E9; margin: 0; font-size: 28px;">SolarCalc Pro</h2>`;

  const infoEmpresaHTML = perfil ? `
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">${perfil.nombre}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">Tel: ${perfil.telefono}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">${perfil.email}</p>
  ` : `<p style="margin: 4px 0; color: #64748B;">Instalador Independiente</p>`;

  // ── Sección ROI ────────────────────────────────────────────────────────────
  const roiHTML = roi ? `
    <div style="margin-top: 40px; page-break-inside: avoid;">

      <!-- Encabezado tarjeta -->
      <div style="background: linear-gradient(135deg, #064E3B 0%, #065F46 100%);
                  border-radius: 12px; padding: 28px; color: white;">

        <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #6EE7B7; letter-spacing: 0.5px;">
          Análisis de Retorno de Inversión
        </h2>
        <p style="margin: 0 0 22px 0; font-size: 12px; color: #A7F3D0;">
          Tarifa CFE: <b>${roi.tarifa}</b> &nbsp;•&nbsp;
          Precio kWh: <b>$${roi.precioKwh}</b> &nbsp;•&nbsp;
          Generación estimada: <b>${roi.kwGeneradosMes.toLocaleString()} kWh/mes</b> &nbsp;•&nbsp;
          Factor de rendimiento: <b>PR = 80%</b>
        </p>

        <!-- 3 chips de ahorro -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 20px;">
          <tr>
            <td style="width: 32%; text-align: center;
                       background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase;
                          letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro mensual</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">
                $${roi.ahorroMensual.toLocaleString()}
              </div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / mes</div>
            </td>
            <td style="width: 32%; text-align: center;
                       background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase;
                          letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro bimestral</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">
                $${roi.ahorroBimestral.toLocaleString()}
              </div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / bimestre</div>
            </td>
            <td style="width: 32%; text-align: center;
                       background: rgba(255,255,255,0.10); border-radius: 8px; padding: 14px;">
              <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase;
                          letter-spacing: 0.8px; margin-bottom: 6px;">Ahorro anual</div>
              <div style="font-size: 28px; font-weight: bold; color: #FFFFFF;">
                $${roi.ahorroAnual.toLocaleString()}
              </div>
              <div style="font-size: 11px; color: #6EE7B7; margin-top: 3px;">MXN / año</div>
            </td>
          </tr>
        </table>

        <!-- Recuperación destacada -->
        <div style="background: rgba(14,165,233,0.22); border: 1.5px solid #38BDF8;
                    border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 13px; color: #BAE6FD; margin-bottom: 6px;">
            Recuperas tu inversión en
          </div>
          <div style="font-size: 48px; font-weight: bold; color: #FFFFFF; line-height: 1.1;">
            ${roi.roiMeses} meses
          </div>
          <div style="font-size: 16px; color: #BAE6FD; margin-top: 4px;">
            (${roi.roiAnos} años)
          </div>
        </div>

        <!-- Proyección 25 años -->
        <div style="background: rgba(0,0,0,0.22); border-radius: 10px; padding: 18px;">
          <div style="font-size: 13px; color: #A7F3D0; font-weight: bold; margin-bottom: 12px;
                      text-transform: uppercase; letter-spacing: 0.5px;">
            Proyección a 25 años — vida útil de los paneles
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 7px 0; font-size: 13px; color: #D1FAE5;">Ahorro total generado</td>
              <td style="text-align: right; font-weight: bold; font-size: 16px; color: #FFFFFF;">
                $${roi.ahorroTotal25.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 7px 0; font-size: 13px; color: #D1FAE5;">Inversión inicial</td>
              <td style="text-align: right; font-weight: bold; font-size: 16px; color: #FCA5A5;">
                − $${total.toLocaleString()}
              </td>
            </tr>
            <tr style="border-top: 1px solid rgba(255,255,255,0.18);">
              <td style="padding: 10px 0 4px; font-size: 16px; font-weight: bold; color: #6EE7B7;">
                Ganancia neta
              </td>
              <td style="text-align: right; font-weight: bold; font-size: 24px; padding-top: 10px;
                         color: ${roi.gananciaTotal25 >= 0 ? '#6EE7B7' : '#FCA5A5'};">
                $${roi.gananciaTotal25.toLocaleString()}
              </td>
            </tr>
          </table>
        </div>

        <p style="margin: 16px 0 0 0; font-size: 10px; color: #6EE7B7;
                  font-style: italic; text-align: center;">
          * Estimado con tarifa ${roi.tarifa} a $${roi.precioKwh}/kWh y PR=80%.
          No incluye incrementos tarifarios anuales (~5%). Sin considerar depreciación de equipo.
        </p>
      </div>
    </div>
  ` : '';

  const html = `
    <html>
      <head>
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
          <h2 style="margin: 0; color: #0EA5E9; font-size: 22px;">${cliente}</h2>
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
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};
