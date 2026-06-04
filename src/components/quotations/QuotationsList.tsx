import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FileText, Clock, CheckCircle2, DollarSign,
  ChevronDown, X, Sparkles,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCLP, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { QuotationStatus } from '../../data/mockData';

interface QuotationsListProps {
  onOpenQuote: (orderId: string) => void;
  onNewQuote: () => void;
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  'Borrador': 'Borrador',
  'Pendiente Aprobación': 'Pendiente',
  'Aprobada Internamente': 'Aprobada',
  'Enviada al Cliente': 'Enviada',
  'Aceptada': 'Aceptada',
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

const ALL_STATUSES: QuotationStatus[] = [
  'Borrador', 'Pendiente Aprobación', 'Aprobada Internamente',
  'Enviada al Cliente', 'Aceptada', 'Rechazada',
];

export function QuotationsList({ onOpenQuote, onNewQuote }: QuotationsListProps) {
  const { orders, customers } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const customerName = customerMap.get(o.customerId)?.name ?? '';
        return (
          o.campaignName.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          (o.quotationCode ?? '').toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      });
    }
    return [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, statusFilter, search, customerMap]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const acceptedThisMonth = orders.filter(
      (o) => o.status === 'Aceptada' && new Date(o.createdAt) >= monthStart
    );
    const amountThisMonth = acceptedThisMonth.reduce((s, o) => s + o.totalAmount, 0);
    return {
      drafts: orders.filter((o) => o.status === 'Borrador').length,
      pending: orders.filter((o) => o.status === 'Pendiente Aprobación').length,
      acceptedCount: acceptedThisMonth.length,
      amountMonth: amountThisMonth,
    };
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display tracking-tightest text-ink">Cotizaciones</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-lg">
            Gestiona tus cotizaciones desde la creación hasta la aceptación del cliente.
          </p>
        </div>
        <button
          onClick={onNewQuote}
          className="group relative flex items-center gap-2 px-5 py-3 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl text-sm font-bold transition-all duration-150 ease-out-expo shadow-viu-soft hover:shadow-lg hover:-translate-y-px"
        >
          <Sparkles size={15} strokeWidth={2.3} />
          Nueva cotización con IA
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={FileText}
          label="Borradores"
          value={String(kpis.drafts)}
          tone="zinc"
        />
        <KPICard
          icon={Clock}
          label="Pendientes aprobación"
          value={String(kpis.pending)}
          tone="viu"
        />
        <KPICard
          icon={CheckCircle2}
          label="Aceptadas este mes"
          value={String(kpis.acceptedCount)}
          tone="emerald"
        />
        <KPICard
          icon={DollarSign}
          label="Monto aceptado del mes"
          value={formatCLP(kpis.amountMonth)}
          tone="ink"
          mono
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente o campaña..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:border-viu-500 focus:ring-4 focus:ring-viu-500/15 transition-all duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-card">
        {filtered.length === 0 ? (
          <EmptyState onNewQuote={onNewQuote} hasFilters={!!search || statusFilter !== 'all'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/40">
                  <th className="text-left label-micro px-6 py-3.5">Código</th>
                  <th className="text-left label-micro px-6 py-3.5">Campaña</th>
                  <th className="text-left label-micro px-6 py-3.5">Cliente</th>
                  <th className="text-left label-micro px-6 py-3.5">Estado</th>
                  <th className="text-right label-micro px-6 py-3.5">Total</th>
                  <th className="text-left label-micro px-6 py-3.5">Creada</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((order, idx) => {
                    const customer = customerMap.get(order.customerId);
                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.2) }}
                        onClick={() => onOpenQuote(order.id)}
                        className="group border-b border-zinc-50 last:border-0 hover:bg-viu-50/30 cursor-pointer transition-colors duration-100"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-ink bg-zinc-100 group-hover:bg-viu-100 px-2 py-1 rounded-md transition-colors duration-100">
                            {order.quotationCode ?? order.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink truncate max-w-[260px]">
                              {order.campaignName}
                            </span>
                            {order.aiGenerated && (
                              <Sparkles size={11} className="text-viu-600 shrink-0" />
                            )}
                          </div>
                          {order.eventName && (
                            <span className="text-xs text-zinc-400">{order.eventName}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-700">
                          {customer?.name ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold',
                            STATUS_STYLES[order.status]
                          )}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-ink font-semibold">
                          {formatCLP(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500">
                          {formatDate(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: typeof FileText;
  label: string;
  value: string;
  tone: 'zinc' | 'viu' | 'emerald' | 'ink';
  mono?: boolean;
}

const TONE_STYLES: Record<KPICardProps['tone'], { bg: string; text: string; card: string; valueColor: string }> = {
  zinc: { bg: 'bg-zinc-100', text: 'text-zinc-700', card: 'bg-white border-zinc-200/80', valueColor: 'text-ink' },
  viu: { bg: 'bg-viu-100', text: 'text-viu-900', card: 'bg-white border-zinc-200/80', valueColor: 'text-ink' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', card: 'bg-white border-zinc-200/80', valueColor: 'text-ink' },
  ink: { bg: 'bg-white/10', text: 'text-viu-500', card: 'bg-ink border-transparent', valueColor: 'text-white' },
};

function KPICard({ icon: Icon, label, value, tone, mono }: KPICardProps) {
  const styles = TONE_STYLES[tone];
  const isDark = tone === 'ink';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'border rounded-2xl p-5 shadow-card transition-all duration-200 ease-out-expo hover:shadow-raised hover:-translate-y-px',
        styles.card
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-500')}>{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', styles.bg)}>
          <Icon size={14} className={styles.text} strokeWidth={2.3} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold tracking-tight', styles.valueColor, mono && 'font-mono')}>{value}</p>
    </motion.div>
  );
}

// ─── Status filter dropdown ──────────────────────────────────────────────────

interface StatusFilterProps {
  value: QuotationStatus | 'all';
  onChange: (v: QuotationStatus | 'all') => void;
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [open, setOpen] = useState(false);
  const currentLabel = value === 'all' ? 'Todos los estados' : STATUS_LABELS[value];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-zinc-300 transition-colors min-w-[200px] justify-between"
      >
        <span>{currentLabel}</span>
        <ChevronDown size={14} className={cn('text-zinc-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200/80 rounded-xl shadow-overlay overflow-hidden z-40 p-1"
          >
            <button
              onClick={() => { onChange('all'); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                value === 'all' ? 'bg-ink text-white' : 'text-zinc-700 hover:bg-zinc-50'
              )}
            >
              Todos los estados
            </button>
            <div className="h-px bg-zinc-100 my-1" />
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  value === s ? 'bg-ink text-white' : 'text-zinc-700 hover:bg-zinc-50'
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onNewQuote, hasFilters }: { onNewQuote: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="relative">
        <div className="absolute inset-0 bg-viu-500/15 blur-2xl rounded-full" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-viu-100 to-viu-50 ring-1 ring-viu-200 flex items-center justify-center mb-5">
          {hasFilters ? (
            <Search size={28} className="text-viu-700" strokeWidth={2} />
          ) : (
            <Sparkles size={28} className="text-viu-700" strokeWidth={2} />
          )}
        </div>
      </div>
      <h3 className="text-h2 text-ink mb-1.5 mt-2">
        {hasFilters ? 'Sin resultados' : 'Aún no hay cotizaciones'}
      </h3>
      <p className="text-sm text-zinc-500 mb-7 text-center max-w-sm">
        {hasFilters
          ? 'Ajusta los filtros o limpia la búsqueda para ver más resultados.'
          : 'Sube los documentos del cliente y deja que la IA arme la cotización.'}
      </p>
      {!hasFilters && (
        <button
          onClick={onNewQuote}
          className="flex items-center gap-2 px-5 py-3 bg-viu-500 hover:bg-viu-400 text-ink rounded-xl text-sm font-bold transition-all duration-150 shadow-viu-soft hover:shadow-md hover:-translate-y-px"
        >
          <Sparkles size={15} strokeWidth={2.3} />
          Crear primera cotización
        </button>
      )}
    </div>
  );
}
