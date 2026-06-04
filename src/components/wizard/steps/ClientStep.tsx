import { useState, useMemo } from 'react';
import { Search, UserPlus, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { WizardState } from '../AIQuoteWizard';
import type { Customer } from '../../../data/mockData';

interface ClientStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  customers: Customer[];
}

export function ClientStep({ state, update, customers }: ClientStepProps) {
  const detected = state.extraction?.clientName ?? '';
  const [mode, setMode] = useState<'pick' | 'new'>(state.newCustomerDraft ? 'new' : 'pick');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Confirma el cliente</h3>
        {detected ? (
          <p className="text-sm text-zinc-500">
            La IA detectó: <span className="font-semibold text-zinc-900">"{detected}"</span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">No se detectó el nombre del cliente.</p>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
        <button
          onClick={() => { setMode('pick'); update({ newCustomerDraft: null }); }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
            mode === 'pick' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          Seleccionar existente
        </button>
        <button
          onClick={() => { setMode('new'); update({ customerId: null }); }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
            mode === 'new' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          Crear nuevo
        </button>
      </div>

      {mode === 'pick' ? (
        <PickExistingClient
          customers={filtered}
          search={search}
          setSearch={setSearch}
          selectedId={state.customerId}
          onSelect={(id) => update({ customerId: id, newCustomerDraft: null })}
        />
      ) : (
        <CreateNewClient
          detected={detected}
          draft={state.newCustomerDraft}
          onChange={(draft) => update({ newCustomerDraft: draft, customerId: null })}
        />
      )}
    </div>
  );
}

// ─── Pick existing ────────────────────────────────────────────────────────────

function PickExistingClient({
  customers, search, setSearch, selectedId, onSelect,
}: {
  customers: Customer[];
  search: string;
  setSearch: (s: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        />
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {customers.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Sin resultados</p>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                selectedId === c.id
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white border-zinc-200 hover:border-zinc-400'
              )}
            >
              <div>
                <p className={cn('text-sm font-medium', selectedId === c.id ? 'text-white' : 'text-zinc-900')}>{c.name}</p>
                <p className={cn('text-xs mt-0.5', selectedId === c.id ? 'text-zinc-300' : 'text-zinc-500')}>
                  Segmento {c.segment} · {c.type} · {c.clientCode || '—'}
                </p>
              </div>
              {selectedId === c.id && <Check size={16} className="text-white shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Create new ───────────────────────────────────────────────────────────────

function CreateNewClient({
  detected, draft, onChange,
}: {
  detected: string;
  draft: Omit<Customer, 'id'> | null;
  onChange: (d: Omit<Customer, 'id'>) => void;
}) {
  const value: Omit<Customer, 'id'> = draft ?? {
    name: detected,
    type: 'Esporádico',
    contact: '',
    debt: 0,
    rut: '',
    projectManager: '',
    address: '',
    segment: 'B',
    clientCode: '',
    initialCorrelative: 1,
    orderCount: 0,
  };

  const set = <K extends keyof Omit<Customer, 'id'>>(key: K, v: Omit<Customer, 'id'>[K]) => {
    onChange({ ...value, [key]: v });
  };

  const codeValid = value.clientCode.length === 3;
  const nameValid = value.name.trim().length > 0;

  return (
    <div className="space-y-4">
      <Field label="Nombre" required>
        <input
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        />
        {!nameValid && <Hint>Requerido</Hint>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Segmento" required>
          <div className="flex gap-1.5">
            {(['A', 'B', 'C'] as const).map((seg) => (
              <button
                key={seg}
                onClick={() => set('segment', seg)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all',
                  value.segment === seg
                    ? seg === 'A' ? 'bg-emerald-500 text-white border-emerald-500'
                      : seg === 'B' ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                )}
              >
                {seg}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tipo" required>
          <CustomerTypeSelect value={value.type} onChange={(t) => set('type', t)} />
        </Field>
      </div>

      <Field label="Código cliente (3 letras)" required>
        <input
          value={value.clientCode}
          onChange={(e) => set('clientCode', e.target.value.toUpperCase().slice(0, 3))}
          placeholder="SBX"
          maxLength={3}
          className={cn(
            'w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 transition-all',
            !codeValid && value.clientCode.length > 0
              ? 'border-rose-300 focus:ring-rose-200'
              : 'border-zinc-200 focus:ring-zinc-900 focus:border-transparent'
          )}
        />
        <Hint>Se usará en el código de cotización (ej: SBX001)</Hint>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="RUT">
          <input
            value={value.rut}
            onChange={(e) => set('rut', e.target.value)}
            placeholder="12.345.678-9"
            className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
        <Field label="Encargado">
          <input
            value={value.projectManager}
            onChange={(e) => set('projectManager', e.target.value)}
            placeholder="Nombre"
            className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
      </div>

      <Field label="Contacto">
        <input
          value={value.contact}
          onChange={(e) => set('contact', e.target.value)}
          placeholder="email@cliente.cl"
          className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        />
      </Field>

      {nameValid && codeValid && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <UserPlus size={14} />
          Se creará al continuar
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-zinc-400 mt-1">{children}</p>;
}

function CustomerTypeSelect({ value, onChange }: { value: Customer['type']; onChange: (v: Customer['type']) => void }) {
  const [open, setOpen] = useState(false);
  const opts: Customer['type'][] = ['Recurrente', 'Esporádico', 'Complejo'];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm hover:border-zinc-300 transition-colors"
      >
        {value}
        <ChevronDown size={14} className={cn('text-zinc-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
            {opts.map((o) => (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false); }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  value === o ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
