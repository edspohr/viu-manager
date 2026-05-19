import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, PenLine, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCLP } from '../../lib/formatters';
import { QuotePDFButton } from './QuotePDF';

// Chilean RUN format: 12.345.678-9 or 12.345.678-K
const RUN_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;

function formatRun(raw: string): string {
  // Strip everything except digits and K
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // Insert dots: XX.XXX.XXX
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
  const { orders, customers, approveOrder } = useStore();
  const order = orders.find((o) => o.id === orderId) ?? null;
  const customer = order ? customers.find((c) => c.id === order.customerId) : null;

  const [run, setRun] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [approved, setApproved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Pre-fill approved state if already approved
  useEffect(() => {
    if (order?.approvalStatus === 'approved') setApproved(true);
  }, [order?.approvalStatus]);

  // ── Canvas helpers ────────────────────────────────────────────────────────

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
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

  function endDraw() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  // ── RUN input ─────────────────────────────────────────────────────────────

  function handleRunChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatRun(e.target.value);
    setRun(formatted);
    if (formatted.length > 0 && !RUN_REGEX.test(formatted)) {
      setRunError('Formato inválido. Ejemplo: 12.345.678-9');
    } else {
      setRunError(null);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleApprove() {
    if (!RUN_REGEX.test(run)) {
      setRunError('Ingresa un RUN válido antes de aprobar.');
      return;
    }
    if (!hasStrokes) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    approveOrder(orderId, run, dataUrl);
    toast.success('Orden aprobada exitosamente');
    setApproved(true);
  }

  const runValid = RUN_REGEX.test(run);
  const canApprove = runValid && hasStrokes;

  // ── Order not found ───────────────────────────────────────────────────────

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle size={48} className="mx-auto text-zinc-300" />
          <p className="text-zinc-500 font-medium">Orden no encontrada</p>
          <p className="text-zinc-400 text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  // ── Already approved ─────────────────────────────────────────────────────

  if (approved) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Orden Aprobada</h2>
          <p className="text-zinc-500 text-sm">
            {customer?.name ?? 'Cliente'} ha aprobado la orden{' '}
            <span className="font-semibold text-zinc-700">{order.campaignName}</span>.
          </p>
          {order.approvalRun && (
            <p className="text-xs text-zinc-400 font-mono">RUN: {order.approvalRun}</p>
          )}
          {order.approvalTimestamp && (
            <p className="text-xs text-zinc-400">
              {new Date(order.approvalTimestamp).toLocaleString('es-CL')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Approval form ─────────────────────────────────────────────────────────

  const displayTotal = order.totalAmount;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
          V
        </div>
        <div>
          <p className="text-xs text-zinc-400 leading-none mb-0.5">VIU Print — Aprobación de Orden</p>
          <p className="font-bold text-zinc-900 text-sm leading-none">{order.campaignName}</p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-lg space-y-8 p-8">

          {/* Order summary — total only, no line items (§5) */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Total a aprobar</p>
            <p className="text-4xl font-bold text-zinc-900 font-mono">{formatCLP(displayTotal)}</p>
            <div className="flex justify-center mt-3">
              <QuotePDFButton order={order} customer={customer ?? null} />
            </div>
            {order.deliveryDate && (
              <p className="text-sm text-zinc-400">
                Entrega estimada:{' '}
                <span className="font-medium text-zinc-600">
                  {new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            )}
          </div>

          <hr className="border-zinc-100" />

          {/* RUN input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-700">
              RUN del aprobador <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={run}
              onChange={handleRunChange}
              placeholder="12.345.678-9"
              maxLength={12}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                runError
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : runValid && run.length > 0
                  ? 'border-emerald-300 focus:ring-emerald-200 bg-emerald-50'
                  : 'border-zinc-200 focus:ring-zinc-200'
              }`}
            />
            {runError && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle size={12} /> {runError}
              </p>
            )}
            {runValid && run.length > 0 && !runError && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle size={12} /> RUN válido
              </p>
            )}
          </div>

          {/* Canvas signature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <PenLine size={14} /> Firma digital <span className="text-red-500">*</span>
              </label>
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <RotateCcw size={12} /> Limpiar
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
            {!hasStrokes && (
              <p className="text-xs text-zinc-400">Usa el mouse o tu dedo para firmar.</p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleApprove}
            disabled={!canApprove}
            className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Aprobar Orden
          </button>

          <p className="text-center text-xs text-zinc-400">
            Al aprobar, confirmas haber revisado el presupuesto y autorizas a VIU Print a proceder con la producción.
          </p>
        </div>
      </main>
    </div>
  );
}
