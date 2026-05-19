import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { formatCLP } from '../../lib/formatters';
import {
  X, Upload, Sparkles, ArrowRight, ArrowLeft, Loader2,
  AlertCircle, Trash2, Plus, Info, CheckCircle, ChevronDown, FileSpreadsheet,
} from 'lucide-react';
import { extractOrderItems, findMatchingCustomer } from '../../lib/geminiService';
import { calculateItemPrice, calculateOrderQuote } from '../../lib/quoteEngine';
import { excelToText, isSpreadsheetFile } from '../../lib/excelParser';
import type { ExtractedItem } from '../../lib/geminiService';
import type { OrderItem, Material } from '../../data/mockData';
import { SkeletonTableRow } from '../ui/Skeleton';
import { NewClientPrompt } from './NewClientPrompt';
import { UnknownMaterialPrompt } from './UnknownMaterialPrompt';

// All valid finishing options (must match geminiService prompt + PricingConfig keys)
const ALL_FINISHINGS = [
  'Corte Recto',
  'Troquelado',
  'Corte CNC',
  'Tiro y Retiro',
  'Corte Contorno',
  'Ojetillos',
  'Pie de Apoyo',
  'Bolsillo Superior',
  'Refuerzo',
  'Instalación',
] as const;

interface AICotizadorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReviewItem extends OrderItem {
  description: string;
  confidence: number;
  isOverridden: boolean;
  warning?: string;
}

type StepType = 'input' | 'processing' | 'review' | 'success';

const STEP_LABELS: Record<StepType, string> = {
  input: 'Entrada',
  processing: 'Procesando',
  review: 'Revisar',
  success: 'Listo',
};
const STEP_ORDER: StepType[] = ['input', 'processing', 'review', 'success'];

function mapExtractedToOrderItem(e: ExtractedItem): OrderItem {
  return {
    materialId: e.materialId,
    width: e.width,
    height: e.height,
    quantity: e.quantity <= 0 ? 1 : e.quantity,
    finishing: e.finishing,
    doubleSided: e.doubleSided,
    suggestedUnitPrice: 0,
    unitPrice: 0,
    subtotal: 0,
    calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 },
  };
}

export const AICotizadorModal = ({ isOpen, onClose }: AICotizadorModalProps) => {
  const { addOrder, addCustomer, addMaterial, customers, materials, pricingConfig } = useStore();

  const [step, setStep] = useState<StepType>('input');
  const [emailText, setEmailText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState('Extrayendo ítems...');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Review step state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [fileStatus, setFileStatus] = useState<'Rojo' | 'Amarillo' | 'Verde'>('Amarillo');
  const [requiresInstallation, setRequiresInstallation] = useState(false);

  // Success
  const [createdCampaignName, setCreatedCampaignName] = useState('');

  // New client / unknown material detection prompts
  const [pendingClientName, setPendingClientName] = useState<string | null>(null);
  const [unknownMaterialQueue, setUnknownMaterialQueue] = useState<string[]>([]);

  // Finishing popover open state per row index
  const [finishingOpen, setFinishingOpen] = useState<number | null>(null);
  const finishingPopoverRef = useRef<HTMLDivElement>(null);

  // Close finishing popover when clicking outside
  useEffect(() => {
    if (finishingOpen === null) return;
    const handler = (e: MouseEvent) => {
      if (finishingPopoverRef.current && !finishingPopoverRef.current.contains(e.target as Node)) {
        setFinishingOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [finishingOpen]);

  // ── Close on Escape key ────────────────────────────────────────────────────
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (finishingOpen !== null) { setFinishingOpen(null); return; }
      onClose();
    }
  }, [onClose, finishingOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  // --- File handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const spreadsheetFiles = files.filter(isSpreadsheetFile);
  const imageFiles = files.filter(f => !isSpreadsheetFile(f));

  // --- Analysis ---
  const handleAnalyze = async () => {
    if (!emailText.trim() && files.length === 0) return;
    setError(null);
    setStep('processing');
    setProcessingLabel('Leyendo archivos...');

    try {
      // Convert spreadsheets to text before sending to Gemini
      let spreadsheetText: string | undefined;
      if (spreadsheetFiles.length > 0) {
        const texts = await Promise.all(spreadsheetFiles.map(excelToText));
        spreadsheetText = texts.join('\n\n');
      }

      setProcessingLabel('Extrayendo ítems con IA...');
      const result = await extractOrderItems(emailText, imageFiles, materials, spreadsheetText);
      setProcessingLabel('Calculando precios...');
      await new Promise(r => setTimeout(r, 300));

      // ── Client detection ───────────────────────────────────────────────────
      if (result.clientName && !selectedCustomerId) {
        const match = findMatchingCustomer(result.clientName, customers);
        if (match) {
          // Auto-select the matched client
          setSelectedCustomerId(match.id);
        } else {
          // Prompt user to create or link
          setPendingClientName(result.clientName);
        }
      }

      // ── Unknown material detection ─────────────────────────────────────────
      if (result.unknownMaterials && result.unknownMaterials.length > 0) {
        setUnknownMaterialQueue(result.unknownMaterials.filter(Boolean));
      }

      const orderItems = result.items.map(mapExtractedToOrderItem);
      const quote = calculateOrderQuote(orderItems, materials, pricingConfig);

      const mapped: ReviewItem[] = quote.calculatedItems.map((calcItem, idx) => ({
        ...calcItem,
        description: result.items[idx]?.description ?? `Ítem ${idx + 1}`,
        confidence: result.items[idx]?.confidence ?? 1,
        isOverridden: false,
      }));

      setCampaignName(result.campaignName);
      setRequiresInstallation(result.requiresInstallation);
      setReviewItems(mapped);
      setDeliveryDate(new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0]);
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al analizar la solicitud.';
      setError(msg);
      toast.error(msg);
      setStep('input');
    }
  };

  // --- Review table editing ---
  const handlePriceOverride = (idx: number, price: number) => {
    setReviewItems(prev => prev.map((item, i) =>
      i !== idx ? item : { ...item, unitPrice: price, subtotal: price * item.quantity, isOverridden: true }
    ));
  };

  const handleDimensionChange = (idx: number, field: 'width' | 'height' | 'quantity', value: number) => {
    setReviewItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      const material = materials.find(m => m.id === updated.materialId);
      if (!material) return updated;
      const recalc = calculateItemPrice(updated, material, pricingConfig);
      return {
        ...recalc,
        description: item.description,
        confidence: item.confidence,
        isOverridden: item.isOverridden,
      };
    }));
  };

  const handleDescriptionChange = (idx: number, value: string) => {
    setReviewItems(prev => prev.map((item, i) => i !== idx ? item : { ...item, description: value }));
  };

  const handleDeleteItem = (idx: number) => {
    setReviewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinishingChange = (idx: number, finishing: string[]) => {
    setReviewItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, finishing };
      const material = materials.find(m => m.id === updated.materialId);
      if (!material) return updated;
      const recalc = calculateItemPrice(updated, material, pricingConfig);
      return {
        ...recalc,
        description: item.description,
        confidence: item.confidence,
        isOverridden: item.isOverridden,
      };
    }));
  };

  const handleAddItem = () => {
    const firstMaterial = materials[0];
    const blank: ReviewItem = {
      materialId: firstMaterial?.id ?? 'm1',
      width: 0,
      height: 0,
      quantity: 1,
      finishing: [],
      doubleSided: false,
      suggestedUnitPrice: 0,
      unitPrice: 0,
      subtotal: 0,
      calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 },
      description: 'Nuevo ítem',
      confidence: 1,
      isOverridden: false,
    };
    setReviewItems(prev => [...prev, blank]);
  };

  // --- Create order ---
  const subtotal = reviewItems.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal + pricingConfig.despachoCost;
  const hasInvalidItems = reviewItems.some(i => i.width === 0 || i.height === 0);

  const handleCreateOrder = () => {
    const orderItems: OrderItem[] = reviewItems.map((item) => ({
      materialId: item.materialId,
      width: item.width,
      height: item.height,
      quantity: item.quantity,
      finishing: item.finishing,
      doubleSided: item.doubleSided,
      suggestedUnitPrice: item.suggestedUnitPrice,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      calculationBreakdown: item.calculationBreakdown,
    }));
    const orderId = `o${crypto.randomUUID().slice(0, 8)}`;
    addOrder({
      id: orderId,
      customerId: selectedCustomerId,
      campaignName,
      description: emailText.slice(0, 200),
      status: 'Por Aprobar',
      items: orderItems,
      totalAmount: total,
      deliveryDate,
      createdAt: new Date().toISOString().split('T')[0],
      fileStatus,
      aiGenerated: true,
    });
    toast.success(`Orden creada: ${campaignName}`);
    setCreatedCampaignName(campaignName);
    setStep('success');
    setTimeout(() => {
      handleReset();
      onClose();
    }, 2000);
  };

  const handleReset = () => {
    setStep('input');
    setEmailText('');
    setFiles([]);
    setError(null);
    setSelectedCustomerId('');
    setReviewItems([]);
    setCampaignName('');
    setDeliveryDate('');
    setFileStatus('Amarillo');
    setRequiresInstallation(false);
    setFinishingOpen(null);
    setPendingClientName(null);
    setUnknownMaterialQueue([]);
  };

  const currentStepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
              <Sparkles size={15} />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
              AI Cotizador — Gemini 2.5
            </h2>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEP_ORDER.map((s, idx) => (
              <div key={s} className="flex items-center gap-1">
                <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  idx === currentStepIdx
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : idx < currentStepIdx
                    ? 'text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-300 dark:text-zinc-700'
                }`}>
                  {idx < currentStepIdx ? '✓ ' : ''}{STEP_LABELS[s]}
                </span>
                {idx < STEP_ORDER.length - 1 && (
                  <span className="text-zinc-300 dark:text-zinc-700 text-xs">›</span>
                )}
              </div>
            ))}
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ERROR BANNER */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm border border-red-200 dark:border-red-800/50">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div className="p-6 space-y-5">
              {/* Customer selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Cliente <span className="text-zinc-400 font-normal normal-case">(la IA puede detectarlo automáticamente)</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => { setSelectedCustomerId(e.target.value); setError(null); }}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 transition-all text-zinc-900 dark:text-white"
                >
                  <option value="">Detectar automáticamente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: text */}
                <div className="flex flex-col min-h-60">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Solicitud / Correo
                  </label>
                  <textarea
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 transition-all text-sm leading-relaxed text-zinc-900 dark:text-white placeholder:text-zinc-400"
                    placeholder="Ej: Necesito 50 carteles de 120x240 cm en Foam para la campaña de verano..."
                    value={emailText}
                    onChange={e => setEmailText(e.target.value)}
                  />
                </div>

                {/* Right: dropzone */}
                <div className="flex flex-col min-h-60">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Archivos Adjuntos (PDF / Imágenes)
                  </label>
                  <div
                    className="flex-1 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/20 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group relative"
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                  >
                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,application/pdf,.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" />
                    {files.length === 0 ? (
                      <>
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="text-zinc-400" size={20} />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Arrastra archivos aquí</p>
                        <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">PDF, JPG, PNG, Excel, CSV</p>
                      </>
                    ) : (
                      <div className="w-full h-full p-4 overflow-y-auto">
                        <p className="text-center text-zinc-400 text-xs mb-3">{files.length} archivo(s)</p>
                        <div className="space-y-1.5">
                          {files.map((f, i) => (
                            <div key={i} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${isSpreadsheetFile(f) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isSpreadsheetFile(f) && <FileSpreadsheet size={11} className="text-emerald-600 shrink-0" />}
                                <span className="truncate max-w-[160px] text-zinc-700 dark:text-zinc-300">{f.name}</span>
                              </div>
                              <button onClick={e => { e.stopPropagation(); e.preventDefault(); removeFile(i); }} className="text-zinc-400 hover:text-red-500 ml-2 shrink-0">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-center text-xs text-zinc-400 mt-3">Clic para agregar más</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: PROCESSING ── */}
          {step === 'processing' && (
            <div className="p-6 space-y-6">
              {/* Spinner + label */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-ping opacity-60" />
                  <div className="relative bg-white dark:bg-zinc-900 rounded-full p-5 shadow-xl border border-zinc-100 dark:border-zinc-800">
                    <Loader2 className="animate-spin text-zinc-900 dark:text-white" size={44} />
                  </div>
                </div>
                <h3 className="mt-8 text-lg font-medium text-zinc-900 dark:text-white">{processingLabel}</h3>
                <p className="text-zinc-400 text-sm mt-1">Gemini 2.5 Flash en proceso...</p>
              </div>

              {/* Skeleton preview rows */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Vista previa de ítems</p>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[1, 2, 3, 4].map((k) => (
                    <SkeletonTableRow key={k} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === 'review' && (
            <div className="p-6 space-y-5">
              {/* Installation callout */}
              {requiresInstallation && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Este pedido puede requerir instalación. Agregar ítem manual si aplica.</span>
                </div>
              )}

              {/* Quote table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '28px 1fr 140px 120px 56px 130px 128px 112px 28px 28px' }}>
                  <span>#</span>
                  <span>Descripción</span>
                  <span>Material</span>
                  <span>Medidas (cm)</span>
                  <span>Cant.</span>
                  <span>Terminación</span>
                  <span className="text-right">Precio Unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span></span>
                  <span></span>
                </div>

                {/* Scrollable rows */}
                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                  {reviewItems.length === 0 && (
                    <p className="text-center text-zinc-400 text-sm py-8">No hay ítems. Agrega uno manualmente.</p>
                  )}
                  {reviewItems.map((item, idx) => {
                    const invalid = item.width === 0 || item.height === 0;
                    const lowConf = item.confidence < 0.7 && !invalid;
                    const rowBg = invalid
                      ? 'bg-red-500/5 dark:bg-red-900/10'
                      : item.isOverridden
                      ? 'bg-amber-500/5 dark:bg-amber-900/10'
                      : 'bg-white dark:bg-zinc-900/50';
                    const matName = materials.find(m => m.id === item.materialId)?.name ?? item.materialId;

                    return (
                      <div key={idx} className={`grid items-center gap-x-2 px-3 py-2 text-sm ${rowBg}`}
                        style={{ gridTemplateColumns: '28px 1fr 140px 120px 56px 130px 128px 112px 28px 28px' }}>

                        {/* # */}
                        <span className="text-zinc-400 font-mono text-xs">{idx + 1}</span>

                        {/* Descripción */}
                        <input
                          value={item.description}
                          onChange={e => handleDescriptionChange(idx, e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-zinc-400 outline-none text-zinc-900 dark:text-white text-xs py-0.5 truncate focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                        />

                        {/* Material */}
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate">{matName}</span>

                        {/* Medidas */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.width || ''}
                            onChange={e => handleDimensionChange(idx, 'width', parseFloat(e.target.value) || 0)}
                            placeholder="W"
                            className={`w-12 bg-transparent border rounded px-1 py-0.5 text-xs font-mono text-center outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 ${invalid && item.width === 0 ? 'border-red-500 text-red-400' : 'border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'}`}
                          />
                          <span className="text-zinc-400 text-xs">×</span>
                          <input
                            type="number"
                            value={item.height || ''}
                            onChange={e => handleDimensionChange(idx, 'height', parseFloat(e.target.value) || 0)}
                            placeholder="H"
                            className={`w-12 bg-transparent border rounded px-1 py-0.5 text-xs font-mono text-center outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 ${invalid && item.height === 0 ? 'border-red-500 text-red-400' : 'border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'}`}
                          />
                        </div>

                        {/* Cantidad */}
                        <input
                          type="number"
                          value={item.quantity}
                          min={1}
                          onChange={e => handleDimensionChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 rounded px-1 py-0.5 text-xs font-mono text-center outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 text-zinc-900 dark:text-white"
                        />

                        {/* Terminación — editable popover */}
                        <div className="relative" ref={finishingOpen === idx ? finishingPopoverRef : undefined}>
                          <button
                            onClick={() => setFinishingOpen(finishingOpen === idx ? null : idx)}
                            className="flex items-center gap-1 w-full text-left"
                          >
                            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                              {item.finishing.length > 0
                                ? item.finishing.map(f => (
                                  <span key={f} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px] whitespace-nowrap">{f}</span>
                                ))
                                : <span className="text-zinc-300 dark:text-zinc-700 text-xs">—</span>
                              }
                            </div>
                            <ChevronDown size={10} className="text-zinc-400 shrink-0" />
                          </button>
                          {finishingOpen === idx && (
                            <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-2 min-w-[170px]">
                              {ALL_FINISHINGS.map(f => (
                                <label key={f} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.finishing.includes(f)}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...item.finishing, f]
                                        : item.finishing.filter(x => x !== f);
                                      handleFinishingChange(idx, next);
                                    }}
                                    className="w-3.5 h-3.5 accent-zinc-900"
                                  />
                                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{f}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Precio Unit. */}
                        <div className="flex items-center justify-end gap-1">
                          {lowConf && <AlertCircle size={12} className="text-amber-500 shrink-0" aria-label={`Confianza: ${Math.round(item.confidence * 100)}%`} />}
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={e => handlePriceOverride(idx, parseFloat(e.target.value) || 0)}
                              className={`w-28 pl-5 pr-2 py-1 rounded-lg border text-xs font-mono text-right outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 transition-colors ${
                                item.isOverridden
                                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400'
                                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Subtotal */}
                        <span className="text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">{formatCLP(item.subtotal)}</span>

                        {/* Tooltip ⓘ */}
                        <div className="relative group/tip flex justify-center">
                          <button className="p-0.5 text-zinc-400 hover:text-zinc-600">
                            <Info size={13} />
                          </button>
                          <div className="pointer-events-none absolute right-0 bottom-7 hidden group-hover/tip:block z-20 w-52 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                            <p className="text-zinc-400">Base: <span className="text-white font-mono">{formatCLP(item.calculationBreakdown.baseCost)}</span></p>
                            <p className="text-zinc-400">Multiplicador: <span className="text-white font-mono">{item.calculationBreakdown.finishingMultiplier}×</span></p>
                            <p className="text-zinc-400">Addons: <span className="text-white font-mono">{formatCLP(item.calculationBreakdown.finishingAddons)}</span></p>
                            {item.calculationBreakdown.planchasUsed !== undefined && (
                              <p className="text-zinc-400">Planchas: <span className="text-white font-mono">{item.calculationBreakdown.planchasUsed.toFixed(3)}</span></p>
                            )}
                            <p className="text-zinc-400">Sugerido: <span className="text-white font-mono">{formatCLP(item.suggestedUnitPrice)}</span></p>
                          </div>
                        </div>

                        {/* Delete */}
                        <button onClick={() => handleDeleteItem(idx)} className="flex justify-center p-0.5 text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add item row */}
                <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button onClick={handleAddItem} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded">
                    <Plus size={13} /> Agregar ítem
                  </button>
                </div>
              </div>

              {/* Order details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 block">Nombre Campaña</label>
                  <input
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 transition-all text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 block">Fecha Entrega</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 transition-all text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 block">Estado Archivo</label>
                  <div className="flex gap-2">
                    {(['Rojo', 'Amarillo', 'Verde'] as const).map(s => (
                      <label key={s} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                        fileStatus === s
                          ? s === 'Rojo' ? 'bg-red-500/15 border-red-500 text-red-500'
                            : s === 'Amarillo' ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'
                      }`}>
                        <input type="radio" className="hidden" checked={fileStatus === s} onChange={() => setFileStatus(s)} />
                        <span className={`w-1.5 h-1.5 rounded-full ${s === 'Rojo' ? 'bg-red-500' : s === 'Amarillo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary panel */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">Subtotal ítems</p>
                    <p className="font-mono font-semibold text-zinc-900 dark:text-white">{formatCLP(subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">Despacho</p>
                    <p className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{formatCLP(pricingConfig.despachoCost)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">TOTAL</p>
                  <p className="font-mono font-bold text-xl text-zinc-900 dark:text-white">{formatCLP(total)}</p>
                </div>
              </div>

              {hasInvalidItems && (
                <p className="flex items-center gap-2 text-red-500 dark:text-red-400 text-xs">
                  <AlertCircle size={13} /> Algunos ítems tienen medidas en 0 — corrígelos antes de crear la orden.
                </p>
              )}
            </div>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={36} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Orden creada</h3>
              <p className="text-zinc-500">→ <span className="text-zinc-900 dark:text-white font-medium">{createdCampaignName}</span></p>
              <p className="text-zinc-400 text-xs">Cerrando automáticamente...</p>
            </div>
          )}
        </div>

        {/* ── Client detection prompt ── */}
        {pendingClientName && (
          <NewClientPrompt
            detectedName={pendingClientName}
            existingCustomers={customers}
            onCreateNew={(customerData) => {
              const id = crypto.randomUUID();
              addCustomer({ ...customerData, id });
              setSelectedCustomerId(id);
              setPendingClientName(null);
              toast.success(`Cliente "${customerData.name}" creado`);
            }}
            onLinkExisting={(customerId) => {
              setSelectedCustomerId(customerId);
              setPendingClientName(null);
            }}
            onDismiss={() => setPendingClientName(null)}
          />
        )}

        {/* ── Unknown material prompt (queue, shown one at a time) ── */}
        {unknownMaterialQueue.length > 0 && !pendingClientName && (
          <UnknownMaterialPrompt
            unknownName={unknownMaterialQueue[0]}
            remaining={unknownMaterialQueue.length - 1}
            existingMaterials={materials}
            onAddNew={(name, type) => {
              const newMat: Material = {
                id: crypto.randomUUID(),
                name,
                type,
                stock: 0,
                unit: type === 'Flexible' ? 'm' : 'planchas',
                supplier1Price: 0,
                supplier2Price: 0,
                supplier3Price: 0,
                activeSupplier: 1,
                ...(type === 'Rígido' ? { sheetWidth: 120, sheetHeight: 240 } : {}),
              };
              addMaterial(newMat);
              setUnknownMaterialQueue((q) => q.slice(1));
              toast.success(`Material "${name}" agregado al catálogo`);
            }}
            onMapExisting={(_materialId) => {
              // Mapping is informational — just dismiss this unknown
              setUnknownMaterialQueue((q) => q.slice(1));
            }}
            onSkip={() => setUnknownMaterialQueue((q) => q.slice(1))}
          />
        )}

        {/* Footer */}
        {(step === 'input' || step === 'review') && (
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
            {step === 'review' ? (
              <>
                <button
                  onClick={() => setStep('input')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-lg"
                >
                  <ArrowLeft size={15} /> Editar solicitud
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={hasInvalidItems || reviewItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                >
                  Crear Orden <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <>
                <div /> {/* spacer */}
                <button
                  onClick={handleAnalyze}
                  disabled={!emailText.trim() && files.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                >
                  Analizar con Gemini <Sparkles size={15} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
