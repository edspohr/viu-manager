import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, ChevronLeft, ChevronRight, Sparkles, FileText, User, Package, ClipboardList, Settings2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { extractOrderItems, findMatchingCustomer, completeMetadata, type GeminiExtractionResult, type ExtractedItem } from '../../lib/geminiService';
import { excelToText, isSpreadsheetFile } from '../../lib/excelParser';
import { pdfToText, isPdfFile } from '../../lib/pdfParser';
import { extractStructured } from '../../lib/structuredExtractor';
import { calculateOrderQuote } from '../../lib/quoteEngine';
import { generateQuotationCode } from '../../lib/orderUtils';
import type { Customer, Material, OrderItem, Order } from '../../data/mockData';

import { UploadStep } from './steps/UploadStep';
import { ClientStep } from './steps/ClientStep';
import { MaterialsStep } from './steps/MaterialsStep';
import { ItemsStep } from './steps/ItemsStep';
import { ExtrasStep } from './steps/ExtrasStep';
import { SummaryStep } from './steps/SummaryStep';

interface AIQuoteWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: WizardStep; label: string; icon: typeof FileText }[] = [
  { id: 1, label: 'Documento', icon: FileText },
  { id: 2, label: 'Cliente', icon: User },
  { id: 3, label: 'Materiales', icon: Package },
  { id: 4, label: 'Ítems', icon: ClipboardList },
  { id: 5, label: 'Extras', icon: Settings2 },
  { id: 6, label: 'Resumen', icon: CheckCircle2 },
];

export interface WizardState {
  // Step 1
  emailText: string;
  files: File[];
  extraction: GeminiExtractionResult | null;
  // Step 2
  customerId: string | null;
  newCustomerDraft: Omit<Customer, 'id'> | null;
  // Step 3 — material decisions: maps extracted material name → existing materialId OR new material data
  materialDecisions: Map<string, { kind: 'existing'; id: string } | { kind: 'new'; data: Omit<Material, 'id'> }>;
  // Step 4
  items: OrderItem[];
  // Step 5
  campaignName: string;
  eventName: string;
  deliveryDate: string;
  requiresInstallation: boolean;
  installationFee: number;
  weekendSurcharge: boolean;
  isSplitQuote: boolean;
  splitAssignments: Map<number, 'A' | 'B'>;
}

const initialState: WizardState = {
  emailText: '',
  files: [],
  extraction: null,
  customerId: null,
  newCustomerDraft: null,
  materialDecisions: new Map(),
  items: [],
  campaignName: '',
  eventName: '',
  deliveryDate: '',
  requiresInstallation: false,
  installationFee: 0,
  weekendSurcharge: false,
  isSplitQuote: false,
  splitAssignments: new Map(),
};

export function AIQuoteWizard({ isOpen, onClose }: AIQuoteWizardProps) {
  const {
    customers, materials, pricingConfig,
    addCustomer, addMaterial, addOrder, updateCustomerOrderCount,
  } = useStore();

  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [analyzing, setAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setStep(1);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const goTo = useCallback((s: WizardStep) => {
    setStep(s);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Step 1: Analyze ─────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!state.emailText.trim() && state.files.length === 0) {
      toast.error('Agrega texto o un documento para analizar');
      return;
    }
    setAnalyzing(true);
    try {
      // 1. Convert every spreadsheet/CSV + every PDF-with-text to plain text
      //    locally. Anything that stays "binary" (images, scanned PDFs) goes
      //    to Gemini as inlineData like before.
      const binaryFiles: File[] = [];
      const localTexts: string[] = [];
      let primaryFileName = '';
      for (const f of state.files) {
        if (isSpreadsheetFile(f)) {
          try {
            const t = await excelToText(f);
            localTexts.push(t);
            if (!primaryFileName) primaryFileName = f.name;
          } catch (e) {
            console.error('Excel parse failed', e);
            toast.error(`No se pudo leer ${f.name}. Verifica que no esté corrupto.`);
            return;
          }
        } else if (isPdfFile(f)) {
          try {
            const t = await pdfToText(f);
            if (t) {
              localTexts.push(t);
              if (!primaryFileName) primaryFileName = f.name;
            } else {
              // Scanned PDF → fall back to inlineData so Gemini can OCR it.
              binaryFiles.push(f);
            }
          } catch (e) {
            console.warn('PDF text extraction failed, sending as image instead', e);
            binaryFiles.push(f);
          }
        } else {
          binaryFiles.push(f);
        }
      }

      const combinedLocalText = localTexts.join('\n\n');
      if (!primaryFileName && state.files[0]) primaryFileName = state.files[0].name;

      // 2. Capa A: try the deterministic extractor first. Only consider it
      //    if we actually have local text (spreadsheets/PDFs); otherwise skip.
      let result: GeminiExtractionResult | null = null;
      let usedLocalExtractor = false;

      if (combinedLocalText.length > 0) {
        const structured = extractStructured(
          `${state.emailText}\n${combinedLocalText}`,
          primaryFileName || 'documento',
          materials,
        );
        if (structured.confidence === 'high') {
          usedLocalExtractor = true;
          // Capa B: if metadata is incomplete, ask Gemini for just the missing
          // pieces with a tiny prompt. Best-effort; failures don't abort.
          let meta = structured.metadata;
          if (structured.missingFields.length > 0) {
            try {
              const completion = await completeMetadata(
                `${state.emailText}\n${combinedLocalText.slice(0, 1500)}`,
                structured.missingFields,
              );
              meta = { ...meta, ...completion };
            } catch (e) {
              console.warn('completeMetadata best-effort failed', e);
            }
          }
          result = {
            campaignName: meta.campaignName ?? '',
            clientName: meta.clientName ?? '',
            items: structured.items,
            unknownMaterials: structured.unknownMaterials,
            requiresInstallation: meta.requiresInstallation ?? false,
            notes: meta.notes ?? '',
          };
        }
      }

      // 3. Capa C: full AI flow as a fallback. Image/scanned-PDF files still
      //    go as inlineData; everything else flows as text in spreadsheetText.
      if (!result) {
        result = await extractOrderItems(
          state.emailText,
          binaryFiles,
          materials,
          combinedLocalText || undefined,
        );
      }

      // Try to match customer
      const matched = findMatchingCustomer(result.clientName, customers);
      // Map extracted items → OrderItem skeletons
      const items: OrderItem[] = result.items.map((ei: ExtractedItem) => ({
        materialId: ei.materialId === 'unknown' ? ei.materialName : ei.materialId,
        width: ei.width,
        height: ei.height,
        quantity: ei.quantity,
        finishing: ei.finishing,
        doubleSided: ei.doubleSided,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: {
          baseCost: 0,
          laborCost: 0,
          finishingMultiplier: 1,
          finishingAddons: 0,
          segmentMultiplier: 1,
        },
      }));
      update({
        extraction: result,
        customerId: matched?.id ?? null,
        items,
        campaignName: result.campaignName,
        requiresInstallation: result.requiresInstallation,
        installationFee: result.requiresInstallation ? pricingConfig.instalacionDefault : 0,
        deliveryDate: new Date(Date.now() + pricingConfig.deliveryLeadDays * 86400000).toISOString().slice(0, 10),
      });
      toast.success(
        usedLocalExtractor
          ? `${result.items.length} ítems detectados (sin IA)`
          : `${result.items.length} ítems detectados`,
      );
      goTo(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al analizar');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 commit: ensure we have a customerId ─────────────────────────────

  const commitClient = (): string | null => {
    if (state.customerId) return state.customerId;
    if (state.newCustomerDraft) {
      const id = `c-${Date.now()}`;
      const newCust: Customer = { id, ...state.newCustomerDraft };
      addCustomer(newCust);
      update({ customerId: id, newCustomerDraft: null });
      return id;
    }
    return null;
  };

  // ── Step 3 commit: persist new materials + remap items to real material IDs ──

  const commitMaterials = (): boolean => {
    const unknowns = state.extraction?.unknownMaterials ?? [];
    // every unknown must have a decision
    for (const name of unknowns) {
      if (!state.materialDecisions.has(name)) {
        toast.error(`Falta decidir qué hacer con "${name}"`);
        return false;
      }
    }

    const nameToId = new Map<string, string>();
    state.materialDecisions.forEach((decision, name) => {
      if (decision.kind === 'existing') {
        nameToId.set(name, decision.id);
      } else {
        const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        addMaterial({ id, ...decision.data });
        nameToId.set(name, id);
      }
    });

    // Remap items whose materialId is the unknown name
    const remapped = state.items.map((item) => {
      if (nameToId.has(item.materialId)) {
        return { ...item, materialId: nameToId.get(item.materialId)! };
      }
      return item;
    });
    update({ items: remapped });
    return true;
  };

  // ── Step 6: Create draft ─────────────────────────────────────────────────────

  const handleCreateDraft = () => {
    const customerId = state.customerId;
    if (!customerId) {
      toast.error('Falta el cliente');
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      toast.error('Cliente inválido');
      return;
    }

    const segMult = pricingConfig.segmentMultipliers[customer.segment] ?? 2.0;
    const installFee = state.requiresInstallation ? state.installationFee : 0;
    const quote = calculateOrderQuote(
      state.items,
      // include locally-added materials (already persisted but may not be in stale read)
      [...materials],
      pricingConfig,
      segMult,
      0,
      state.weekendSurcharge,
      installFee
    );

    const calculatedItems = quote.calculatedItems;

    // Split assignment
    let splitPartA: OrderItem[] | undefined;
    let splitPartB: OrderItem[] | undefined;
    if (state.isSplitQuote) {
      splitPartA = [];
      splitPartB = [];
      calculatedItems.forEach((item, idx) => {
        const target = state.splitAssignments.get(idx) ?? 'A';
        (target === 'A' ? splitPartA! : splitPartB!).push(item);
      });
    }

    const order: Order = {
      id: `o-${Date.now()}`,
      customerId,
      campaignName: state.campaignName || 'Cotización sin nombre',
      description: state.extraction?.notes ?? '',
      status: 'Borrador',
      items: calculatedItems,
      totalAmount: quote.totalAmount,
      deliveryDate: state.deliveryDate,
      createdAt: new Date().toISOString(),
      aiGenerated: true,
      quotationCode: generateQuotationCode(customer),
      eventName: state.eventName || undefined,
      requiresInstallation: state.requiresInstallation || undefined,
      installationFee: state.requiresInstallation ? state.installationFee : undefined,
      weekendSurcharge: state.weekendSurcharge || undefined,
      isSplitQuote: state.isSplitQuote || undefined,
      splitPartA,
      splitPartB,
    };

    addOrder(order);
    updateCustomerOrderCount(customerId);
    toast.success(`Cotización ${order.quotationCode} creada como borrador`);
    close();
  };

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 2) {
      const id = commitClient();
      if (!id) { toast.error('Selecciona o crea un cliente para continuar'); return; }
    }
    if (step === 3) {
      if (!commitMaterials()) return;
    }
    if (step < 6) goTo((step + 1) as WizardStep);
  };

  const handleBack = () => {
    if (step > 1) goTo((step - 1) as WizardStep);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const canGoNext = (() => {
    if (step === 1) return state.extraction !== null;
    if (step === 2) return state.customerId !== null || state.newCustomerDraft !== null;
    if (step === 3) {
      const unknowns = state.extraction?.unknownMaterials ?? [];
      return unknowns.every((n) => state.materialDecisions.has(n));
    }
    if (step === 4) return state.items.length > 0;
    if (step === 5) return state.campaignName.trim().length > 0 && state.deliveryDate.length > 0;
    return true;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header with steps */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-viu-500/30 blur-md rounded-xl" />
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-viu-400 to-viu-600 text-ink flex items-center justify-center shadow-viu-soft">
                  <Sparkles size={16} strokeWidth={2.3} />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-ink leading-tight">Nueva cotización con IA</h2>
                <p className="text-xs text-zinc-500 leading-tight mt-0.5">
                  <span className="font-semibold text-zinc-700">Paso {step}</span> de 6 — {STEPS[step - 1].label}
                </p>
              </div>
            </div>
            <button onClick={close} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors">
              <X size={18} className="text-zinc-400" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => {
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <div key={s.id} className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{
                      width: isDone || isActive ? '100%' : '0%',
                      backgroundColor: isDone ? '#18181B' : isActive ? '#FFC72C' : '#F4F4F5',
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && (
                <UploadStep
                  state={state}
                  update={update}
                  onAnalyze={handleAnalyze}
                  analyzing={analyzing}
                />
              )}
              {step === 2 && (
                <ClientStep
                  state={state}
                  update={update}
                  customers={customers}
                />
              )}
              {step === 3 && (
                <MaterialsStep
                  state={state}
                  update={update}
                  materials={materials}
                />
              )}
              {step === 4 && (
                <ItemsStep
                  state={state}
                  update={update}
                  materials={materials}
                  pricingConfig={pricingConfig}
                  customers={customers}
                />
              )}
              {step === 5 && (
                <ExtrasStep
                  state={state}
                  update={update}
                />
              )}
              {step === 6 && (
                <SummaryStep
                  state={state}
                  customers={customers}
                  materials={materials}
                  pricingConfig={pricingConfig}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50/50">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            Atrás
          </button>

          {step === 1 ? (
            <div /> /* analyze button is in step body */
          ) : step === 6 ? (
            <button
              onClick={handleCreateDraft}
              className="flex items-center gap-2 px-5 py-2.5 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl text-sm font-bold transition-all duration-150 shadow-viu-soft hover:shadow-md"
            >
              <CheckCircle2 size={15} strokeWidth={2.3} />
              Crear borrador
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Continuar
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
