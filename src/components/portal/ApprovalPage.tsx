import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, PenLine, RotateCcw, Loader2, Calendar, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCLP } from '../../lib/formatters';
import { QuotePDFButton } from './QuotePDF';
import { getOrderFromFirestore, syncOrderToFirestore } from '../../lib/firestoreSync';
import type { Order } from '../../data/mockData';

const RUN_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;

function formatRun(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const parts: string[] = [];
  let remaining = body;
  while (remaining.length > 3) {
    parts.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  if (remaining) parts.unshift(remaining);
  return parts.join('.') + (dv ? `-${dv}` : '');
}

interface ApprovalPageProps {
  orderId: string;
}

export function ApprovalPage({ orderId }: ApprovalPageProps) {
  const { orders, customers, approveOrder, pricingConfig, materials } = useStore();
  const localOrder = orders.find((o) => o.id === orderId) ?? null;

  const [firestoreOrder, setFirestoreOrder] = useState<Order | null | 'loading'>(
    localOrder ? null : 'loading'
  );

  useEffect(() => {
    if (localOrder) return;
    getOrderFromFirestore(orderId)
      .then((o) => setFirestoreOrder(o))
      .catch(() => setFirestoreOrder(null));
  }, [orderId, localOrder]);

  const order = localOrder ?? (firestoreOrder !== 'loading' ? firestoreOrder : null);
  const isLoadingRemote = !localOrder && firestoreOrder === 'loading';
  const customer = order ? customers.find((c) => c.id === order.customerId) ?? null : null;

  const [run, setRun] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvedOrder, setApprovedOrder] = useState<Order | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (order?.approvalStatus === 'approved' || order?.status === 'Aceptada') setApproved(true);
  }, [order?.approvalStatus, order?.status]);

  // ── Canvas ────────────────────────────────────────────────────────────────

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setIsDrawing(true);
    setHasStrokes(true);
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() { setIsDrawing(false); lastPos.current = null; }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function handleRunChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatRun(e.target.value);
    setRun(formatted);
    if (formatted.length > 0 && !RUN_REGEX.test(formatted)) {
      setRunError('Formato inválido. Ejemplo: 12.345.678-9');
    } else {
      setRunError(null);
    }
  }

  async function handleApprove() {
    if (!RUN_REGEX.test(run)) {
      setRunError('Ingresa un RUN válido antes de aceptar.');
      return;
    }
    if (!hasStrokes || !order) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (localOrder) {
      approveOrder(orderId, run, dataUrl);
    } else {
      const updated: Order = {
        ...order,
        status: 'Aceptada',
        approvalStatus: 'approved',
        approvalRun: run,
        approvalTimestamp: new Date().toISOString(),
        approvalSignatureDataUrl: dataUrl,
      };
      try {
        await syncOrderToFirestore(updated);
        setApprovedOrder(updated);
      } catch {
        toast.error('Error al guardar. Intenta nuevamente.');
        return;
      }
    }

    toast.success('Cotización aceptada');
    setApproved(true);
  }

  const runValid = RUN_REGEX.test(run);
  const canApprove = runValid && hasStrokes;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoadingRemote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="mx-auto text-zinc-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-overlay max-w-md w-full p-10 text-center space-y-5">
          <div className="flex justify-center">
            <img src="/viu-logo.png" alt="VIU" className="w-12 h-12 rounded-xl shadow-soft opacity-70" />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 mx-auto flex items-center justify-center">
            <AlertCircle size={28} className="text-zinc-400" />
          </div>
          <p className="text-ink font-semibold">Cotización no encontrada</p>
          <p className="text-zinc-500 text-sm">El enlace es incorrecto o la cotización fue eliminada.</p>
        </div>
      </div>
    );
  }

  // ── Already approved ─────────────────────────────────────────────────────

  const displayOrder = approvedOrder ?? order;

  if (approved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl border border-zinc-200/80 shadow-overlay max-w-md w-full p-10 text-center space-y-6"
        >
          <div className="flex justify-center">
            <img src="/viu-logo.png" alt="VIU" className="w-12 h-12 rounded-xl shadow-soft" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 18 }}
            className="relative w-24 h-24 mx-auto"
          >
            <div className="absolute inset-0 bg-emerald-500/25 blur-2xl rounded-full" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-300/40">
              <CheckCircle size={44} className="text-white" strokeWidth={2.3} />
            </div>
          </motion.div>
          <div>
            <h2 className="text-h1 text-ink">¡Cotización aceptada!</h2>
            <p className="text-zinc-500 text-sm mt-2.5">
              {customer?.name ?? 'Cliente'} aceptó <span className="font-semibold text-ink">{displayOrder.campaignName}</span>.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-100 space-y-1">
            {displayOrder.approvalRun && (
              <p className="text-xs text-zinc-400 font-mono">RUN: {displayOrder.approvalRun}</p>
            )}
            {displayOrder.approvalTimestamp && (
              <p className="text-xs text-zinc-400">
                {new Date(displayOrder.approvalTimestamp).toLocaleString('es-CL')}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Approval form ─────────────────────────────────────────────────────────

  const subtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
  const installFee = order.requiresInstallation ? (order.installationFee ?? 0) : 0;
  const total = subtotal + pricingConfig.despachoCost + installFee;
  const iva = Math.round(total * 0.19);
  const totalWithIVA = total + iva;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/viu-logo.png" alt="VIU" className="w-10 h-10 rounded-xl shadow-soft" />
          <div className="flex-1 min-w-0">
            <p className="label-micro leading-none mb-1">VIU Print · Aprobación de cotización</p>
            <p className="font-bold text-ink text-sm leading-none truncate">{order.campaignName}</p>
          </div>
          {order.quotationCode && (
            <span className="text-xs font-mono font-bold text-ink bg-viu-100 px-2.5 py-1 rounded-lg shrink-0">
              {order.quotationCode}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Total hero */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-ink via-zinc-900 to-zinc-800 text-white rounded-3xl p-9 shadow-overlay overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-viu-500/15 blur-3xl rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-viu-500/10 blur-3xl rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] font-bold text-viu-500 uppercase tracking-[0.1em]">Total a aprobar</p>
            <p className="text-5xl font-bold font-mono mt-3 tracking-tight">{formatCLP(totalWithIVA)}</p>
            <p className="text-xs text-zinc-400 mt-1.5">Incluye IVA (19%)</p>
            {order.deliveryDate && (
              <div className="mt-7 pt-6 border-t border-white/10 flex items-center gap-2 text-sm text-zinc-300">
                <Calendar size={13} className="text-viu-500" />
                <span>Entrega estimada: <span className="font-semibold text-white">
                  {new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span></span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Items summary */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={11} /> Detalle ({order.items.length} ítems)
          </h3>
          <div className="space-y-2 mb-4">
            {order.items.map((item, idx) => {
              const mat = materials.find((m) => m.id === item.materialId);
              return (
                <div key={idx} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                  <span className="text-xs font-mono text-zinc-400 w-5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 truncate">{mat?.name ?? 'Ítem'}</p>
                    <p className="text-xs text-zinc-500">{item.width}×{item.height} cm · {item.quantity} u.</p>
                  </div>
                  <span className="font-mono text-sm font-medium text-zinc-700">{formatCLP(item.subtotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-200 space-y-1.5">
            <Line label="Subtotal" value={formatCLP(subtotal)} />
            <Line label="Despacho" value={formatCLP(pricingConfig.despachoCost)} />
            {installFee > 0 && <Line label="Instalación" value={formatCLP(installFee)} />}
            <Line label="IVA (19%)" value={formatCLP(iva)} />
            <div className="pt-2 mt-2 border-t border-zinc-200 flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span className="font-mono">{formatCLP(totalWithIVA)}</span>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-zinc-100 flex justify-center">
            <QuotePDFButton order={order} customer={customer} pricingConfig={pricingConfig} materials={materials} />
          </div>
        </motion.div>

        {/* Approval form */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Aceptar cotización</h3>

          {/* RUN */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-700">
              RUN del aprobador <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={run}
              onChange={handleRunChange}
              placeholder="12.345.678-9"
              maxLength={12}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                runError
                  ? 'border-rose-300 focus:ring-rose-200 bg-rose-50'
                  : runValid && run.length > 0
                  ? 'border-emerald-300 focus:ring-emerald-200 bg-emerald-50'
                  : 'border-zinc-200 focus:ring-zinc-900 focus:border-transparent'
              }`}
            />
            {runError && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5">
                <AlertCircle size={12} /> {runError}
              </p>
            )}
            {runValid && run.length > 0 && !runError && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle size={12} /> RUN válido
              </p>
            )}
          </div>

          {/* Signature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <PenLine size={14} /> Firma digital <span className="text-rose-500">*</span>
              </label>
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <RotateCcw size={11} /> Limpiar
              </button>
            </div>
            <div className="relative rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={560}
                height={160}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasStrokes && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-zinc-300 text-sm select-none">Dibuja tu firma aquí</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={() => { void handleApprove(); }}
            disabled={!canApprove}
            className="w-full py-3.5 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-viu-soft hover:shadow-lg"
          >
            Aceptar cotización
          </button>

          <p className="text-center text-[11px] text-zinc-400 leading-relaxed">
            Al aceptar, confirmas haber revisado el presupuesto y autorizas a VIU Print a proceder con la producción.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-700">{value}</span>
    </div>
  );
}
