import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { formatCLP } from '../../lib/formatters';
import type { Order, Customer, PricingConfig, Material } from '../../data/mockData';

interface QuotePDFProps {
  order: Order;
  customer: Customer | null;
  pricingConfig: PricingConfig;
  materials: Material[];
}

export function QuotePDFButton({ order, customer, pricingConfig, materials }: QuotePDFProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${order.quotationCode ?? order.id} — ${order.campaignName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #18181b; background: white; font-size: 12px; line-height: 1.5; }
    .page { max-width: 780px; margin: 0 auto; padding: 40px 44px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #FFC72C; margin-bottom: 24px; }
    .brand { display: flex; align-items: flex-start; gap: 14px; }
    .brand-logo { width: 56px; height: 56px; border-radius: 12px; object-fit: contain; }
    .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
    .brand-name .dot { color: #F0B500; }
    .brand-sub { font-size: 11px; color: #71717a; margin-top: 3px; }
    .header-right { text-align: right; }
    .header-right .title { font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #18181b; }
    .header-right .meta { font-size: 11px; color: #52525b; margin-top: 6px; }
    .header-right .meta span { font-weight: 700; color: #18181b; }

    /* Client block */
    .client-block { border: 1px solid #d4d4d8; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .client-field .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; }
    .client-field .value { font-size: 12px; color: #18181b; font-weight: 500; margin-top: 1px; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; border-radius: 8px; overflow: hidden; }
    thead tr { background: #18181b; color: white; }
    th { padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; color: #FFC72C; }
    th:last-child, th.right { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .td-right { text-align: right; font-family: monospace; }
    .section-header td { background: #f4f4f5; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; padding: 5px 10px; }
    .item-detail { font-size: 10px; color: #71717a; margin-top: 2px; }
    .badge { display: inline-block; background: #f4f4f5; color: #52525b; padding: 1px 6px; border-radius: 99px; font-size: 9px; font-weight: 600; margin: 1px 1px 1px 0; }

    /* Totals */
    .totals-block { margin-left: auto; width: 280px; margin-bottom: 28px; background: #fafaf8; padding: 16px 18px; border-radius: 10px; border: 1px solid #e4e4e7; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total { border-top: 2px solid #18181b; border-bottom: none; padding-top: 10px; margin-top: 4px; font-size: 14px; font-weight: 800; color: #18181b; }
    .totals-row .mono { font-family: 'Courier New', monospace; }

    /* Footer */
    .footer { border-top: 1px solid #e4e4e7; padding-top: 14px; margin-top: 8px; }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 10px; color: #71717a; }
    .footer-conditions { font-size: 10px; color: #71717a; margin-bottom: 10px; }
    .footer-conditions p { margin-bottom: 2px; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${content.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const today = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const subtotal = order.items.reduce((s, i) => s + i.subtotal, 0) || order.totalAmount;
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const getMatName = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    return mat?.name ?? materialId;
  };

  const renderItemsRows = (items: Order['items'], startIdx = 0) =>
    items.map((item, i) => {
      const idx = startIdx + i;
      return `<tr>
        <td style="color:#a1a1aa;font-family:monospace;width:28px">${idx + 1}</td>
        <td>
          <div>${getMatName(item.materialId)}${item.doubleSided ? ' (Doble cara)' : ''}</div>
          <div class="item-detail">${item.width} × ${item.height} cm · ${item.quantity} unid.</div>
          ${item.finishing.length > 0 ? `<div style="margin-top:3px">${item.finishing.map((f) => `<span class="badge">${f}</span>`).join('')}</div>` : ''}
        </td>
        <td class="td-right">${formatCLP(item.unitPrice)}</td>
        <td class="td-right">${formatCLP(item.subtotal)}</td>
      </tr>`;
    }).join('');

  const itemsTableContent = order.isSplitQuote
    ? `<tr class="section-header"><td colspan="4">Parte A</td></tr>
       ${renderItemsRows(order.splitPartA ?? [], 0)}
       <tr class="section-header"><td colspan="4">Parte B</td></tr>
       ${renderItemsRows(order.splitPartB ?? [], (order.splitPartA ?? []).length)}`
    : renderItemsRows(order.items);

  return (
    <>
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="brand">
              <img src={`${window.location.origin}/viu-logo.png`} alt="VIU" className="brand-logo" />
              <div>
                <div className="brand-name">VIU<span className="dot">.</span> PRINT LTDA.</div>
                {pricingConfig.empresaRut && (
                  <div className="brand-sub">RUT: {pricingConfig.empresaRut}</div>
                )}
                {pricingConfig.empresaPhone && (
                  <div className="brand-sub">Tel: {pricingConfig.empresaPhone}</div>
                )}
                {pricingConfig.empresaEmail && (
                  <div className="brand-sub">{pricingConfig.empresaEmail}</div>
                )}
              </div>
            </div>
            <div className="header-right">
              <div className="title">COTIZACION</div>
              <div className="meta">
                N° <span>{order.quotationCode ?? order.id}</span>
              </div>
              <div className="meta">
                Fecha: <span>{today}</span>
              </div>
            </div>
          </div>

          {/* Client block */}
          <div className="client-block">
            <div className="client-grid">
              <div className="client-field">
                <div className="label">CLIENTE</div>
                <div className="value">{customer?.name ?? '—'}</div>
              </div>
              <div className="client-field">
                <div className="label">R.U.T</div>
                <div className="value">{customer?.rut || '—'}</div>
              </div>
              <div className="client-field">
                <div className="label">ENCARGADO</div>
                <div className="value">{customer?.projectManager || '—'}</div>
              </div>
              <div className="client-field">
                <div className="label">NOMBRE EVENTO</div>
                <div className="value">{order.eventName || order.campaignName}</div>
              </div>
              <div className="client-field">
                <div className="label">CORREO</div>
                <div className="value">{customer?.contact || '—'}</div>
              </div>
              <div className="client-field">
                <div className="label">CONTACTO</div>
                <div className="value">{customer?.contact || '—'}</div>
              </div>
              <div className="client-field">
                <div className="label">NUMERO COTIZACION</div>
                <div className="value">{order.quotationCode ?? order.id}</div>
              </div>
              {order.deliveryDate && (
                <div className="client-field">
                  <div className="label">FECHA ENTREGA</div>
                  <div className="value">
                    {new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items table (injected as raw HTML via dangerouslySetInnerHTML) */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>DETALLE</th>
                <th className="right" style={{ width: 110 }}>VALOR UNITARIO</th>
                <th className="right" style={{ width: 110 }}>VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: itemsTableContent }} />
          </table>

          {/* Totals */}
          <div className="totals-block">
            <div className="totals-row">
              <span>SUB TOTAL</span>
              <span className="mono">{formatCLP(subtotal)}</span>
            </div>
            {order.requiresInstallation && (order.installationFee ?? 0) > 0 && (
              <div className="totals-row">
                <span>INSTALACIÓN</span>
                <span className="mono">{formatCLP(order.installationFee ?? 0)}</span>
              </div>
            )}
            <div className="totals-row">
              <span>IVA (19%)</span>
              <span className="mono">{formatCLP(iva)}</span>
            </div>
            <div className="totals-row total">
              <span>TOTAL</span>
              <span className="mono">{formatCLP(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="footer-conditions">
              <p>Valores más IVA &nbsp;·&nbsp; Validez cotización: 7 días &nbsp;·&nbsp; Condición de venta: 30 DÍAS</p>
              {order.weekendSurcharge && (
                <p style={{ color: '#b45309', marginTop: 4 }}>* Aplica recargo fin de semana</p>
              )}
            </div>
            {pricingConfig.bankDetails && (
              <div className="footer-grid">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Datos de Pago</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{pricingConfig.bankDetails}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 bg-white text-zinc-700 hover:border-viu-500 hover:bg-viu-50 hover:text-ink rounded-xl text-sm font-semibold transition-all duration-150"
      >
        <Printer size={14} strokeWidth={2.2} />
        Descargar PDF
      </button>
    </>
  );
}
