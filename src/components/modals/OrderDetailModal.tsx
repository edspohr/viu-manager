import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X, ChevronRight, ChevronDown, Sparkles,
  AlertCircle, User, Calendar, Hash, ArrowRight, Cpu, Clock, Zap, Link2, CheckCheck, History,
} from 'lucide-react';
import { useStore, type PriceChangeLog, type StatusChangeLog } from '../../store/useStore';
import { formatCLP, formatDate } from '../../lib/formatters';
import type { Order } from '../../data/mockData';

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Order['status'], string> = {
  'Solicitud': 'bg-zinc-100 text-zinc-600',
  'Por Aprobar': 'bg-amber-100 text-amber-700',
  'En Producción': 'bg-blue-100 text-blue-700',
  'Despacho': 'bg-purple-100 text-purple-700',
  'Terminado': 'bg-emerald-100 text-emerald-700',
};

const STATUS_NEXT: Partial<Record<Order['status'], Order['status']>> = {
  'Solicitud': 'Por Aprobar',
  'Por Aprobar': 'En Producción',
  'En Producción': 'Despacho',
  'Despacho': 'Terminado',
};

const CLIENT_STATUS_LABELS: Record<Order['status'], string> = {
  'Solicitud': 'En espera',
  'Por Aprobar': 'Pendiente de aprobación',
  'En Producción': 'En producción',
  'Despacho': 'En camino',
  'Terminado': 'Entregado',
};

const FILE_STATUS_DOT: Record<Order['fileStatus'], string> = {
  'Rojo': 'bg-rose-500',
  'Amarillo': 'bg-amber-400',
  'Verde': 'bg-emerald-500',
};

const FILE_STATUS_MESSAGES: Record<Order['fileStatus'], string> = {
  'Rojo': 'Archivos pendientes — contacta a tu ejecutivo',
  'Amarillo': 'Archivos en revisión',
  'Verde': 'Archivos aprobados ✓',
};

const CHECKLIST_ITEMS = [
  'Material reservado',
  'Archivos revisados y aprobados',
  'Impresión iniciada',
  'Control de calidad OK',
  'Embalado y listo para despacho',
];

// ─── Component ───────────────────────────────────────────────────────────────

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const {
    orders, customers, materials, pricingConfig, currentUser,
    updateOrderStatus, updateFileStatus, updateOrderItemPrice, updateOperationsChecklist,
    updateMachineAssignment, updateManHours, updateOvertimeEnabled, updateOrderExternal,
    priceChangeLogs, statusChangeLogs,
  } = useStore();

  const order = orders.find(o => o.id === orderId) ?? null;
  const customer = order ? customers.find(c => c.id === order.customerId) : null;

  // Local state for inline price editing (committed to store on blur)
  const [localPrices, setLocalPrices] = useState<Record<number, string>>({});
  const [linkCopied, setLinkCopied] = useState(false);
  // Expanded breakdown rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Track previous orderId to reset local state when it changes
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  if (orderId !== trackedOrderId) {
    setTrackedOrderId(orderId);
    if (orderId) {
      setLocalPrices({});
      setExpandedRows(new Set());
      setLinkCopied(false);
    }
  }

  // Close on Escape key
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!orderId) return;
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [orderId, handleEsc]);

  if (!orderId || !order) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  const isOperations = currentUser.role === 'operations';
  const isClient = currentUser.role === 'client';

  const itemsSubtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
  const despachoCost = pricingConfig.despachoCost;
  // Use computed total when items have prices, fall back to stored totalAmount for seed data
  const displayTotal = itemsSubtotal > 0
    ? itemsSubtotal + despachoCost
    : order.totalAmount;

  const nextStatus = STATUS_NEXT[order.status];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMoveStatus = () => {
    if (!nextStatus) return;
    updateOrderStatus(order.id, nextStatus);
    toast.success(`Orden movida a "${nextStatus}"`);
  };

  const handleFileStatusChange = (status: Order['fileStatus']) => {
    updateFileStatus(order.id, status);
    toast.success('Estado de archivo actualizado');
  };

  const handlePriceBlur = (itemIdx: number) => {
    const raw = localPrices[itemIdx];
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed !== order.items[itemIdx].unitPrice) {
      updateOrderItemPrice(order.id, itemIdx, parsed);
    }
    setLocalPrices(prev => { const n = { ...prev }; delete n[itemIdx]; return n; });
  };

  const getPriceDisplay = (itemIdx: number) =>
    localPrices[itemIdx] !== undefined
      ? localPrices[itemIdx]
      : String(order.items[itemIdx].unitPrice);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  };

  // ─── Checklist ─────────────────────────────────────────────────────────────

  const checklist: boolean[] =
    order.operationsChecklist && order.operationsChecklist.length === CHECKLIST_ITEMS.length
      ? order.operationsChecklist
      : Array(CHECKLIST_ITEMS.length).fill(false);

  const checklistDone = checklist.filter(Boolean).length;

  const toggleChecklist = (idx: number) => {
    const updated = checklist.map((v, i) => (i === idx ? !v : v));
    updateOperationsChecklist(order.id, updated);
  };

  // ─── Render sections (inlined, not as sub-components) ──────────────────────

  const renderClientContent = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status]}`}>
          {CLIENT_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {order.deliveryDate && (
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar size={12} /> Fecha entrega
            </p>
            <p className="font-medium text-zinc-900">
              {formatDate(order.deliveryDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total</p>
          <p className="font-mono font-bold text-xl text-zinc-900">{formatCLP(displayTotal)}</p>
        </div>
      </div>

      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        order.fileStatus === 'Rojo' ? 'bg-rose-50 border-rose-200 text-rose-700' :
        order.fileStatus === 'Amarillo' ? 'bg-amber-50 border-amber-200 text-amber-700' :
        'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${FILE_STATUS_DOT[order.fileStatus]}`} />
        <p className="text-sm font-medium">{FILE_STATUS_MESSAGES[order.fileStatus]}</p>
      </div>
    </div>
  );

  const renderItemsTable = () => (
    <div className="px-6 pb-2">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider py-4 border-b border-zinc-100">
        Ítems del Pedido ({order.items.length})
      </h3>

      {order.items.length === 0 ? (
        <p className="text-zinc-400 text-sm py-6 text-center">Sin ítems registrados.</p>
      ) : (
        <>
          {/* Table header */}
          <div
            className="grid text-[11px] font-semibold text-zinc-400 uppercase tracking-wider py-2 border-b border-zinc-100"
            style={{ gridTemplateColumns: '24px 1fr 130px 110px 44px 120px 110px 96px 24px' }}
          >
            <span>#</span>
            <span>Material</span>
            <span>Medidas</span>
            <span>Cant.</span>
            <span></span>
            <span>Terminación</span>
            <span className="text-right">Precio Unit.</span>
            <span className="text-right">Subtotal</span>
            <span></span>
          </div>

          {/* Rows */}
          {order.items.map((item, idx) => {
            const mat = materials.find(m => m.id === item.materialId);
            const matName = mat?.name ?? item.materialId;
            const isExpanded = expandedRows.has(idx);
            const bd = item.calculationBreakdown;

            return (
              <div key={idx} className="border-b border-zinc-50 last:border-0">
                {/* Main row */}
                <div
                  className="grid items-center gap-x-2 py-3 text-sm hover:bg-zinc-50 transition-colors"
                  style={{ gridTemplateColumns: '24px 1fr 130px 110px 44px 120px 110px 96px 24px' }}
                >
                  <span className="text-zinc-400 font-mono text-xs">{idx + 1}</span>

                  <span className="text-zinc-800 font-medium text-xs truncate">{matName}</span>

                  <span className="text-zinc-500 text-xs font-mono">{item.width} × {item.height} cm</span>

                  <span className="text-zinc-500 text-xs">{item.quantity} u.</span>

                  <span className={`w-2 h-2 rounded-full ${item.doubleSided ? 'bg-blue-400' : 'bg-zinc-200'}`}
                    title={item.doubleSided ? 'Doble cara' : 'Simple'} />

                  <div className="flex flex-wrap gap-0.5">
                    {item.finishing.length > 0
                      ? item.finishing.map(f => (
                        <span key={f} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px]">{f}</span>
                      ))
                      : <span className="text-zinc-300 text-xs">—</span>
                    }
                  </div>

                  {/* Precio Unit — editable for admin */}
                  {isAdmin ? (
                    <div className="flex justify-end">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                        <input
                          type="number"
                          value={getPriceDisplay(idx)}
                          onChange={e => setLocalPrices(prev => ({ ...prev, [idx]: e.target.value }))}
                          onBlur={() => handlePriceBlur(idx)}
                          className="w-24 pl-5 pr-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors hover:border-zinc-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-right font-mono text-xs text-zinc-700">{formatCLP(item.unitPrice)}</span>
                  )}

                  <span className="text-right font-mono text-xs font-medium text-zinc-800">{formatCLP(item.subtotal)}</span>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleRow(idx)}
                    className="p-0.5 text-zinc-300 hover:text-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {/* Breakdown row */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 mb-3 px-4 py-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Base: <span className="font-mono text-zinc-700">{formatCLP(bd.baseCost)}</span></span>
                        <span>·</span>
                        <span>Mult: <span className="font-mono text-zinc-700">{bd.finishingMultiplier}×</span></span>
                        <span>·</span>
                        <span>Addons: <span className="font-mono text-zinc-700">{formatCLP(bd.finishingAddons)}</span></span>
                        {bd.planchasUsed !== undefined && (
                          <>
                            <span>·</span>
                            <span>Planchas: <span className="font-mono text-zinc-700">{bd.planchasUsed.toFixed(3)}</span></span>
                          </>
                        )}
                        <span>·</span>
                        <span>Sugerido: <span className="font-mono text-zinc-700">{formatCLP(item.suggestedUnitPrice)}</span></span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Totals row */}
          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 text-sm">
            <span className="text-zinc-500">Subtotal ítems</span>
            <span className="font-mono font-medium text-zinc-800">{formatCLP(itemsSubtotal)}</span>
            <span className="text-zinc-300">+</span>
            <span className="text-zinc-500">Despacho</span>
            <span className="font-mono text-zinc-600">{formatCLP(despachoCost)}</span>
            <span className="text-zinc-300">=</span>
            <span className="text-zinc-500 font-semibold">TOTAL</span>
            <span className="font-mono font-bold text-base text-zinc-900">{formatCLP(displayTotal)}</span>
          </div>
        </>
      )}
    </div>
  );

  const renderOperationsChecklist = () => (
    <div className="px-6 pb-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider py-4 border-b border-zinc-100 mb-4">
        Checklist de Operaciones
      </h3>

      {/* Machine assignment + man-hours + overtime */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Machine */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            <Cpu size={11} /> Máquina
          </label>
          <select
            value={order.machineAssignment ?? ''}
            onChange={(e) => updateMachineAssignment(order.id, e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
          >
            <option value="">Sin asignar</option>
            {pricingConfig.machines.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Man-hours */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            <Clock size={11} /> Horas (HH)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={order.manHours ?? ''}
            onChange={(e) => updateManHours(order.id, parseFloat(e.target.value) || 0)}
            placeholder="0.0"
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
          />
        </div>

        {/* Overtime */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            <Zap size={11} /> Turno Extra
          </label>
          <label className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors">
            <input
              type="checkbox"
              checked={order.overtimeEnabled ?? false}
              onChange={(e) => updateOvertimeEnabled(order.id, e.target.checked)}
              className="w-4 h-4 rounded accent-zinc-900"
            />
            <span className="text-sm text-zinc-700">Fin de semana</span>
            {order.overtimeEnabled && (
              <span className="ml-auto text-xs font-semibold text-amber-600">+25%</span>
            )}
          </label>
          {order.overtimeEnabled && order.totalAmount > 0 && (
            <p className="mt-1 text-xs text-amber-600 font-mono pl-1">
              Recargo: +{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(order.totalAmount * 0.25))}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>Progreso</span>
          <span className="font-mono">{checklistDone}/{CHECKLIST_ITEMS.length}</span>
        </div>
        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(checklistDone / CHECKLIST_ITEMS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((label, idx) => (
          <label
            key={idx}
            className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors group"
          >
            <input
              type="checkbox"
              checked={checklist[idx]}
              onChange={() => toggleChecklist(idx)}
              className="w-4 h-4 rounded accent-zinc-900"
            />
            <span className={`text-sm transition-colors ${checklist[idx] ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderDescription = () => (
    <div className="px-6 pb-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider py-4 border-b border-zinc-100 mb-4">
        Descripción
      </h3>
      <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
        {order.description || 'Sin descripción.'}
      </p>
    </div>
  );

  const renderHistory = () => {
    const orderPriceLogs = priceChangeLogs.filter((l) => l.orderId === order.id);
    const orderStatusLogs = statusChangeLogs.filter((l) => l.orderId === order.id);

    type HistoryEntry = { ts: string; label: React.ReactNode };
    const entries: HistoryEntry[] = [
      ...orderPriceLogs.map((l: PriceChangeLog) => ({
        ts: l.timestamp,
        label: (
          <span className="text-xs text-zinc-500">
            Precio ítem #{l.itemIndex + 1}:{' '}
            <span className="font-mono line-through text-zinc-400">{formatCLP(l.oldPrice)}</span>
            {' → '}
            <span className="font-mono font-semibold text-amber-700">{formatCLP(l.newPrice)}</span>
            <span className="text-zinc-400"> · {l.changedBy}</span>
          </span>
        ),
      })),
      ...orderStatusLogs.map((l: StatusChangeLog) => ({
        ts: l.timestamp,
        label: (
          <span className="text-xs text-zinc-500">
            Estado: <span className="font-medium text-zinc-700">{l.fromStatus || '—'}</span>
            {' → '}
            <span className="font-medium text-blue-700">{l.toStatus}</span>
            <span className="text-zinc-400"> · {l.changedBy}</span>
          </span>
        ),
      })),
    ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    if (entries.length === 0) return null;

    return (
      <div className="px-6 pb-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider py-4 border-b border-zinc-100 mb-3 flex items-center gap-1.5">
          <History size={11} /> Historial
        </h3>
        <div className="space-y-2">
          {entries.map((e, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5 shrink-0" />
              <div>
                {e.label}
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {new Date(e.ts).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="border-l border-zinc-100 p-6 space-y-6 bg-zinc-50/50">

      {/* Client */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <User size={11} /> Cliente
        </p>
        {customer ? (
          <div>
            <p className="font-semibold text-zinc-900 text-sm">{customer.name}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{customer.type}</p>
            {customer.contact && (
              <p className="text-zinc-500 text-xs mt-0.5">{customer.contact}</p>
            )}
            {customer.debt > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                <AlertCircle size={11} />
                Deuda: {formatCLP(customer.debt)}
              </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">Sin cliente</p>
        )}
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Estado</p>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </div>

      {/* Move status — admin only */}
      {isAdmin && nextStatus && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mover a:</p>
          <button
            onClick={handleMoveStatus}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <span>{nextStatus}</span>
            <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </button>
        </div>
      )}

      {/* Approval link — admin/superadmin, Por Aprobar orders */}
      {isAdmin && order.status === 'Por Aprobar' && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Link de Aprobación
          </p>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?order=${order.id}`;
              navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true);
                toast.success('Link copiado al portapapeles');
                setTimeout(() => setLinkCopied(false), 3000);
              });
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
              linkCopied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50'
            }`}
          >
            {linkCopied ? <CheckCheck size={14} /> : <Link2 size={14} />}
            {linkCopied ? '¡Copiado!' : 'Copiar link de aprobación'}
          </button>
        </div>
      )}

      {/* Approval status badge — when already approved */}
      {order.approvalStatus === 'approved' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700">
          <CheckCheck size={13} />
          Aprobado — RUN {order.approvalRun}
        </div>
      )}

      {/* External order toggle — admin/superadmin only */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Producción Externa</p>
          <label className="flex items-center gap-2.5 px-3 py-2 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
            <input
              type="checkbox"
              checked={order.isExternal ?? false}
              onChange={(e) => updateOrderExternal(order.id, e.target.checked, order.externalSupplier ?? '')}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <span className="text-sm text-zinc-700">Externo</span>
            {order.isExternal && (
              <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold tracking-wide">
                EXTERNO
              </span>
            )}
          </label>
          {order.isExternal && (
            <input
              type="text"
              value={order.externalSupplier ?? ''}
              onChange={(e) => updateOrderExternal(order.id, true, e.target.value)}
              placeholder="Proveedor externo..."
              className="mt-2 w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
            />
          )}
        </div>
      )}

      {/* Dates */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar size={11} /> Creación
          </p>
          <p className="text-sm text-zinc-700">
            {formatDate(order.createdAt)}
          </p>
        </div>
        {order.deliveryDate && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Entrega</p>
            <p className="text-sm text-zinc-700">
              {formatDate(order.deliveryDate)}
            </p>
          </div>
        )}
      </div>

      {/* AI badge */}
      {order.aiGenerated && (
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-xl text-xs font-medium">
          <Sparkles size={12} />
          Generado con IA
        </div>
      )}

      {/* Total summary in sidebar */}
      <div className="pt-4 border-t border-zinc-100">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total orden</p>
        <p className="font-mono font-bold text-xl text-zinc-900">{formatCLP(displayTotal)}</p>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/60 backdrop-blur-sm p-4 pt-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden mb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <Hash size={11} />{order.id}
              </span>
              {order.aiGenerated && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-white rounded-full text-[10px] font-medium">
                  <Sparkles size={9} /> IA
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 leading-tight truncate">{order.campaignName}</h2>
          </div>

          {/* File status */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin || currentUser.role === 'superadmin' ? (
              <div className="flex gap-1.5">
                {(['Rojo', 'Amarillo', 'Verde'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleFileStatusChange(s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                      order.fileStatus === s
                        ? s === 'Rojo' ? 'bg-rose-100 border-rose-300 text-rose-700'
                          : s === 'Amarillo' ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'border-zinc-200 text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${FILE_STATUS_DOT[s]}`} />
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                order.fileStatus === 'Rojo' ? 'bg-rose-100 text-rose-700'
                  : order.fileStatus === 'Amarillo' ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${FILE_STATUS_DOT[order.fileStatus]}`} />
                {order.fileStatus}
              </span>
            )}
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="grid lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {isClient ? (
              renderClientContent()
            ) : (
              <>
                {renderItemsTable()}
                {(isOperations || isAdmin) && renderOperationsChecklist()}
                {renderDescription()}
                {isAdmin && renderHistory()}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {renderSidebar()}
          </div>
        </div>
      </div>
    </div>
  );
}
