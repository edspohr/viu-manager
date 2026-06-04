import { useMemo } from 'react';
import { CheckCircle2, Wrench, Zap, Split, Calendar } from 'lucide-react';
import { formatCLP, formatDate } from '../../../lib/formatters';
import { calculateOrderQuote } from '../../../lib/quoteEngine';
import { generateQuotationCode } from '../../../lib/orderUtils';
import type { WizardState } from '../AIQuoteWizard';
import type { Customer, Material, PricingConfig } from '../../../data/mockData';

interface SummaryStepProps {
  state: WizardState;
  customers: Customer[];
  materials: Material[];
  pricingConfig: PricingConfig;
}

export function SummaryStep({ state, customers, materials, pricingConfig }: SummaryStepProps) {
  const customer = customers.find((c) => c.id === state.customerId);
  const segMult = customer ? pricingConfig.segmentMultipliers[customer.segment] : 2.0;

  const quote = useMemo(() => {
    const installFee = state.requiresInstallation ? state.installationFee : 0;
    return calculateOrderQuote(
      state.items,
      materials,
      pricingConfig,
      segMult,
      0,
      state.weekendSurcharge,
      installFee
    );
  }, [state.items, state.requiresInstallation, state.installationFee, state.weekendSurcharge, materials, pricingConfig, segMult]);

  const quotationCode = customer ? generateQuotationCode(customer) : '—';
  const iva = Math.round(quote.subtotal * 0.19);
  const totalWithIVA = quote.totalAmount + iva;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Resumen</h3>
        <p className="text-sm text-zinc-500">Revisa antes de crear el borrador.</p>
      </div>

      {/* Top summary card */}
      <div className="relative bg-gradient-to-br from-ink via-zinc-900 to-zinc-800 text-white rounded-2xl p-7 overflow-hidden shadow-raised">
        <div className="absolute top-0 right-0 w-64 h-64 bg-viu-500/15 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-viu-500/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold text-viu-500 uppercase tracking-[0.1em]">Código de cotización</p>
            <p className="text-3xl font-bold font-mono mt-1.5 tracking-tight">{quotationCode}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em]">Total con IVA</p>
            <p className="text-3xl font-bold font-mono mt-1.5 tracking-tight">{formatCLP(totalWithIVA)}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 pt-5 border-t border-white/10">
          <Stat label="Cliente" value={customer?.name ?? '—'} />
          <Stat label="Segmento" value={`${customer?.segment ?? '—'} (×${segMult})`} />
          <Stat label="Ítems" value={String(state.items.length)} />
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
        <Row label="Campaña" value={state.campaignName} />
        {state.eventName && <Row label="Evento" value={state.eventName} />}
        <Row
          label="Entrega"
          value={state.deliveryDate ? formatDate(state.deliveryDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          icon={Calendar}
        />
        {state.requiresInstallation && (
          <Row label="Instalación" value={formatCLP(state.installationFee)} icon={Wrench} />
        )}
        {state.weekendSurcharge && (
          <Row label="Recargo fin de semana" value="Aplica" icon={Zap} />
        )}
        {state.isSplitQuote && (
          <Row label="Cotización dividida" value="Parte A / Parte B" icon={Split} />
        )}
      </div>

      {/* Totals breakdown */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-2">
        <TotalLine label="Subtotal ítems" value={formatCLP(quote.subtotal)} />
        <TotalLine label="Despacho" value={formatCLP(quote.despachoCost)} />
        {state.requiresInstallation && (
          <TotalLine label="Instalación" value={formatCLP(state.installationFee)} />
        )}
        <TotalLine label="IVA (19%)" value={formatCLP(iva)} />
        <div className="pt-2 mt-2 border-t border-zinc-300 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-900">TOTAL</span>
          <span className="font-mono font-bold text-lg text-zinc-900">{formatCLP(totalWithIVA)}</span>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-viu-50 border border-viu-200 rounded-xl">
        <CheckCircle2 size={16} className="text-viu-700 shrink-0 mt-0.5" />
        <p className="text-sm text-viu-900">
          Al continuar, se creará un <strong>borrador</strong>. Luego podrás enviarlo a aprobación interna del superadmin.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5 truncate">{value}</p>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Wrench }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <span className="text-sm text-zinc-900 font-medium">{value}</span>
    </div>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className="font-mono text-zinc-900">{value}</span>
    </div>
  );
}
