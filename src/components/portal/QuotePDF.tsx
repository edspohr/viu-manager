import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { formatCLP, formatDate } from '../../lib/formatters';
import type { Order, Customer } from '../../data/mockData';

interface QuotePDFProps {
  order: Order;
  customer: Customer | null;
}

export function QuotePDFButton({ order, customer }: QuotePDFProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Cotización VIU Print — ${order.campaignName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, Arial, sans-serif; color: #18181b; background: white; font-size: 13px; line-height: 1.5; }
          .page { max-width: 740px; margin: 0 auto; padding: 40px; }
          .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; border-bottom: 2px solid #18181b; padding-bottom: 20px; }
          .brand { display: flex; flex-direction: column; gap: 2px; }
          .brand-name { font-size: 22px; font-weight: 800; color: #18181b; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #71717a; }
          .doc-meta { text-align: right; }
          .doc-meta .label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; }
          .doc-meta .value { font-weight: 600; color: #18181b; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-item .label { font-size: 11px; color: #71717a; }
          .info-item .value { font-weight: 600; color: #18181b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; }
          th { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; padding: 8px 10px; background: #f4f4f5; border-bottom: 1px solid #e4e4e7; }
          td { padding: 10px 10px; border-bottom: 1px solid #f4f4f5; vertical-align: top; font-size: 12px; }
          tr:last-child td { border-bottom: none; }
          .total-row { background: #18181b; color: white; }
          .total-row td { padding: 12px 10px; font-weight: 700; font-size: 15px; border: none; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; background: #f4f4f5; color: #52525b; margin: 2px 2px 2px 0; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; font-size: 10px; color: #a1a1aa; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const today = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="brand">
              <div className="brand-name">VIU Print</div>
              <div className="brand-sub">Impresión de gran formato · Chile</div>
              <div className="brand-sub" style={{ marginTop: 4 }}>contacto@viuprint.cl</div>
            </div>
            <div className="doc-meta">
              <div className="label">Cotización</div>
              <div className="value" style={{ fontSize: 16, marginTop: 4 }}>{order.id}</div>
              <div className="label" style={{ marginTop: 8 }}>Fecha</div>
              <div className="value" style={{ fontSize: 12 }}>{today}</div>
            </div>
          </div>

          {/* Client + Campaign */}
          <div className="section">
            <div className="section-title">Información del pedido</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="label">Cliente</div>
                <div className="value">{customer?.name ?? '—'}</div>
              </div>
              <div className="info-item">
                <div className="label">Campaña</div>
                <div className="value">{order.campaignName}</div>
              </div>
              {order.deliveryDate && (
                <div className="info-item">
                  <div className="label">Fecha de entrega estimada</div>
                  <div className="value">{formatDate(order.deliveryDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items — no prices, no material names per §5 */}
          <div className="section">
            <div className="section-title">Detalle de ítems</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descripción</th>
                  <th>Medidas</th>
                  <th>Cantidad</th>
                  <th>Terminaciones</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#a1a1aa', fontFamily: 'monospace', width: 28 }}>{idx + 1}</td>
                    <td>Ítem {idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.width} × {item.height} cm</td>
                    <td>{item.quantity} u.</td>
                    <td>
                      {item.finishing.length > 0
                        ? item.finishing.map((f) => (
                          <span key={f} className="badge">{f}</span>
                        ))
                        : <span style={{ color: '#a1a1aa' }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={4} style={{ textAlign: 'right', color: '#d4d4d8', fontWeight: 400, fontSize: 12 }}>TOTAL (incluye despacho)</td>
                  <td style={{ fontFamily: 'monospace' }}>{formatCLP(order.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="footer">
            <span>VIU Print · Impresión Gran Formato · Chile</span>
            <span>Esta cotización tiene validez de 15 días hábiles desde su emisión.</span>
          </div>
        </div>
      </div>

      {/* Trigger button */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 rounded-xl text-sm font-medium transition-all"
      >
        <Printer size={14} />
        Descargar cotización PDF
      </button>
    </>
  );
}
