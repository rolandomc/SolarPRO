// utils/pdfGenerator.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface ItemCotizacion { id: string; descripcion: string; cantidad: string; precio: string; }
export interface PerfilEmpresa { nombre: string; telefono: string; email: string; logoBase64: string; }

export const generarCotizacionProfesional = async (
  cliente: string, 
  items: ItemCotizacion[], 
  total: number, 
  perfil: PerfilEmpresa | null
) => {
  const filasHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #475569;">${item.cantidad}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-weight: 500;">${item.descripcion}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">$${parseFloat(item.precio).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: bold;">$${(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</td>
    </tr>
  `).join('');

  // Bloque del encabezado de la empresa (logo e info)
  const logoHTML = perfil?.logoBase64 
    ? `<img src="${perfil.logoBase64}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />` 
    : `<h2 style="color: #0EA5E9; margin: 0; font-size: 28px;">SolarCalc Pro</h2>`;

  const infoEmpresaHTML = perfil ? `
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">${perfil.nombre}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">📞 ${perfil.telefono}</p>
    <p style="margin: 4px 0; color: #64748B; font-size: 14px;">✉️ ${perfil.email}</p>
  ` : `<p style="margin: 4px 0; color: #64748B;">Instalador Independiente</p>`;

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
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};