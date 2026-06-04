import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Hash, Calendar, User, Sparkles, ChevronDown, ChevronRight,
  Send, CheckCircle2, XCircle, Link2, CheckCheck, Wrench, Zap, Split,
  Trash2, Clock,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCLP, formatDate } from '../../lib/formatters';
import { QuotePDFButton } from '../portal/QuotePDF';
import { cn } from '../../lib/utils';
import type { QuotationStatus } from '../../data/mockData';

interface QuotationDetailProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  'Borrador': 'Borrador',
  'Pendiente Aprobación': 'Pendiente de aprobación',
  'Aprobada Internamente': 'Aprobada internamente',
  'Enviada al Cliente': 'Enviada al cliente',
  'Aceptada': 'Aceptada por cliente',
  'Rechazada': 'Rechazada',
};

const STATUS_STYLES: Record<QuotationStatus, string> = {
  'Borrador': 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200',
  'Pendiente Aprobación': 'bg-viu-100 text-viu-900 ring-1 ring-inset ring-viu-200',
  'Aprobada Internamente': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  'Enviada al Cliente': 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
  'Aceptada': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'Rechazada': 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

export function QuotationDetail({ orderId, onBack }: QuotationDetailProps) {
  const {
    orders, customers, materials, pricingConfig, currentUser,
    submitForApproval, internallyApproveOrder, sendToClient, rejectOrder,
    updateOrderItemPrice, deleteOrder,
  } = useStore();

  const order = orders.find((o) => o.id === orderId);
  const customer = order ? customers.find((c) => c.id === order.customerId) : null;
  const isSuperadmin = currentUser.role === 'superadmin';

  const [linkCopied, setLinkCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [localPrices, setLocalPrices] = useState<Record<number, string>>({});

  const subtotal = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((s, i) => s + i.subtotal, 0);
  }, [order]);

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <p className="text-sm text-zinc-500">Cotización no encontrada.</p>
        </div>
      </div>
    );
  }

  const installFee = order.requiresInstallation ? (order.installationFee ?? 0) : 0;
  const total = subtotal + pricingConfig.despachoCost + installFee;
  const iva = Math.round(total * 0.19);
  const totalWithIVA = total + iva;

  const toggleRow = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpanded(next);
  };

  const handlePriceBlur = (idx: number) => {
    const raw = localPrices[idx];
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed !== order.items[idx].unitPrice) {
      updateOrderItemPrice(order.id, idx, parsed);
    }
    setLocalPrices((p) => { const n = { ...p }; delete n[idx]; return n; });
  };

  const getPriceDisplay = (idx: number) =>
    localPrices[idx] !== undefined ? localPrices[idx] : String(order.items[idx].unitPrice);

  const copyApprovalLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?order=${order.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  const handleSubmit = () => { submitForApproval(order.id); toast.success('Enviada a aprobación'); };
  const handleApprove = () => { internallyApproveOrder(order.id); toast.success('Aprobada internamente'); };
  const handleSend = () => { sendToClient(order.id); toast.success('Enviada al cliente. Comparte el link de aprobación.'); };
  const handleReject = () => {
    if (!rejectionReason.trim()) { toast.error('Indica un motivo'); return; }
    rejectOrder(order.id, rejectionReason.trim());
    toast.success('Cotización rechazada');
    setRejectionOpen(false);
  };
  const handleDelete = () => {
    if (!confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return;
    deleteOrder(order.id);
    toast.success('Borrador eliminado');
    onBack();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-ink transition-colors group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        Volver a cotizaciones
      </button>

      {/* Header card */}
      <div className="relative bg-white border border-zinc-200/80 rounded-2xl p-7 shadow-card overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-viu-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-sm font-bold text-ink bg-viu-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Hash size={12} />{order.quotationCode ?? order.id.slice(0, 8)}
              </span>
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_STYLES[order.status])}>
                {STATUS_LABELS[order.status]}
              </span>
              {order.aiGenerated && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-ink text-viu-500 rounded-full text-[10px] font-bold">
                  <Sparkles size={9} /> IA
                </span>
              )}
              {order.weekendSurcharge && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-viu-100 text-viu-900 rounded-full text-[10px] font-semibold">
                  <Zap size={9} /> Fin semana
                </span>
              )}
              {order.isSplitQuote && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
                  <Split size={9} /> A · B
                </span>
              )}
            </div>
            <h1 className="text-h1 text-ink">{order.campaignName}</h1>
            {order.eventName && <p className="text-sm text-zinc-500 mt-1.5">{order.eventName}</p>}

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><User size={11} /> {customer?.name ?? '—'}</span>
              <span className="flex items-center gap-1.5"><Calendar size={11} /> Creada {formatDate(order.createdAt, { day: 'numeric', month: 'short' })}</span>
              {order.deliveryDate && (
                <span className="flex items-center gap-1.5"><Clock size={11} /> Entrega {formatDate(order.deliveryDate, { day: 'numeric', month: 'short' })}</span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="label-micro">Total con IVA</p>
            <p className="font-mono font-bold text-3xl text-ink mt-1 tracking-tight">{formatCLP(totalWithIVA)}</p>
          </div>
        </div>

        {order.rejectionReason && (
          <div className="relative mt-5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
            <span className="font-semibold">Motivo de rechazo:</span> {order.rejectionReason}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items + totals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-card">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-h2 text-ink">Ítems <span className="text-zinc-400 font-medium">({order.items.length})</span></h2>
            </div>
            {order.items.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">Sin ítems</p>
            ) : (
              <div>
                {order.items.map((item, idx) => {
                  const mat = materials.find((m) => m.id === item.materialId);
                  const isOpen = expanded.has(idx);
                  return (
                    <div key={idx} className="border-b border-zinc-50 last:border-0">
                      <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50/60 transition-colors">
                        <button onClick={() => toggleRow(idx)} className="text-zinc-400 hover:text-zinc-700">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="text-xs font-mono text-zinc-400 w-6">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">{mat?.name ?? item.materialId}</p>
                          <p className="text-xs text-zinc-500">{item.width} × {item.height} cm · {item.quantity} u.{item.doubleSided && ' · Doble cara'}</p>
                        </div>
                        {item.finishing.length > 0 && (
                          <div className="hidden md:flex gap-1 flex-wrap max-w-[200px]">
                            {item.finishing.slice(0, 3).map((f) => (
                              <span key={f} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px]">{f}</span>
                            ))}
                            {item.finishing.length > 3 && (
                              <span className="px-1.5 py-0.5 text-zinc-400 text-[10px]">+{item.finishing.length - 3}</span>
                            )}
                          </div>
                        )}
                        {/* Editable unit price */}
                        {order.status === 'Borrador' || order.status === 'Pendiente Aprobación' ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                            <input
                              type="number"
                              value={getPriceDisplay(idx)}
                              onChange={(e) => setLocalPrices((p) => ({ ...p, [idx]: e.target.value }))}
                              onBlur={() => handlePriceBlur(idx)}
                              className="w-28 pl-5 pr-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-zinc-700 w-28 text-right">{formatCLP(item.unitPrice)}</span>
                        )}
                        <span className="font-mono text-sm font-semibold text-zinc-900 w-24 text-right">{formatCLP(item.subtotal)}</span>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 pl-14 text-xs text-zinc-500 space-y-1.5 bg-zinc-50/50">
                              <p>Base: <span className="font-mono text-zinc-700">{formatCLP(item.calculationBreakdown.baseCost)}</span></p>
                              <p>Mano de obra: <span className="font-mono text-zinc-700">{formatCLP(item.calculationBreakdown.laborCost)}</span></p>
                              <p>Mult. terminación: <span className="font-mono text-zinc-700">×{item.calculationBreakdown.finishingMultiplier}</span></p>
                              <p>Addons terminación: <span className="font-mono text-zinc-700">{formatCLP(item.calculationBreakdown.finishingAddons)}</span></p>
                              <p>Mult. segmento: <span className="font-mono text-zinc-700">×{item.calculationBreakdown.segmentMultiplier}</span></p>
                              <p>Sugerido IA: <span className="font-mono text-zinc-700">{formatCLP(item.suggestedUnitPrice)}</span></p>
                              {item.finishing.length > 0 && (
                                <p>Terminaciones: {item.finishing.join(', ')}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-2.5 shadow-card">
            <TotalLine label="Subtotal ítems" value={formatCLP(subtotal)} />
            <TotalLine label="Despacho" value={formatCLP(pricingConfig.despachoCost)} />
            {installFee > 0 && <TotalLine label="Instalación" value={formatCLP(installFee)} icon={Wrench} />}
            <TotalLine label="IVA (19%)" value={formatCLP(iva)} />
            <div className="pt-4 mt-2 border-t border-zinc-200 flex items-center justify-between">
              <span className="text-sm font-bold text-ink tracking-tight">TOTAL CON IVA</span>
              <span className="font-mono font-bold text-2xl text-ink tracking-tight">{formatCLP(totalWithIVA)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Workflow actions */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-card space-y-2.5">
            <h3 className="label-micro mb-2">Acciones</h3>

            {order.status === 'Borrador' && (
              <>
                <ActionButton primary icon={Send} onClick={handleSubmit}>
                  Enviar a aprobación
                </ActionButton>
                <ActionButton danger icon={Trash2} onClick={handleDelete}>
                  Eliminar borrador
                </ActionButton>
              </>
            )}

            {order.status === 'Pendiente Aprobación' && isSuperadmin && (
              <>
                <ActionButton primary icon={CheckCircle2} onClick={handleApprove}>
                  Aprobar internamente
                </ActionButton>
                <ActionButton onClick={() => setRejectionOpen(true)} icon={XCircle}>
                  Rechazar
                </ActionButton>
              </>
            )}

            {order.status === 'Pendiente Aprobación' && !isSuperadmin && (
              <p className="text-xs text-zinc-500 italic">Esperando aprobación del superadmin.</p>
            )}

            {order.status === 'Aprobada Internamente' && (
              <ActionButton primary icon={Send} onClick={handleSend}>
                Enviar al cliente
              </ActionButton>
            )}

            {(order.status === 'Enviada al Cliente' || order.status === 'Aceptada') && (
              <ActionButton
                primary={!linkCopied}
                icon={linkCopied ? CheckCheck : Link2}
                onClick={copyApprovalLink}
              >
                {linkCopied ? '¡Copiado!' : 'Copiar link del cliente'}
              </ActionButton>
            )}

            {/* PDF — always available */}
            <QuotePDFButton
              order={order}
              customer={customer ?? null}
              pricingConfig={pricingConfig}
              materials={materials}
            />
          </div>

          {/* Client */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-card">
            <h3 className="label-micro mb-3">Cliente</h3>
            {customer ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-zinc-900">{customer.name}</p>
                <div className="space-y-1 text-xs text-zinc-500">
                  {customer.rut && <p>RUT: <span className="text-zinc-700">{customer.rut}</span></p>}
                  {customer.projectManager && <p>Encargado: <span className="text-zinc-700">{customer.projectManager}</span></p>}
                  {customer.contact && <p>Contacto: <span className="text-zinc-700">{customer.contact}</span></p>}
                  <p>Segmento: <span className="text-zinc-700">{customer.segment}</span> · Tipo: <span className="text-zinc-700">{customer.type}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Sin cliente</p>
            )}
          </div>

          {/* Approval info */}
          {order.approvalStatus === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCheck size={14} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aceptada por cliente</h3>
              </div>
              <div className="space-y-1 text-xs text-emerald-700">
                {order.approvalRun && <p>RUN: <span className="font-mono">{order.approvalRun}</span></p>}
                {order.approvalTimestamp && (
                  <p>{new Date(order.approvalTimestamp).toLocaleString('es-CL')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4" onClick={() => setRejectionOpen(false)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-1">Rechazar cotización</h3>
              <p className="text-sm text-zinc-500 mb-4">Indica el motivo para futura referencia.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Ej. Precios fuera de rango, datos del cliente incorrectos..."
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setRejectionOpen(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:border-zinc-400 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleReject} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
                  Rechazar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: typeof Send;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ActionButton({ icon: Icon, primary, danger, onClick, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
        primary && 'bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink shadow-viu-soft hover:shadow-md',
        danger && 'text-rose-600 border border-rose-200 hover:bg-rose-50',
        !primary && !danger && 'border border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
      )}
    >
      <Icon size={14} strokeWidth={2.2} />
      {children}
    </button>
  );
}

function TotalLine({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Wrench }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <span className="font-mono text-zinc-900">{value}</span>
    </div>
  );
}
