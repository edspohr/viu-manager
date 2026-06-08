import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Plus, Trash2, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { SectionHeader } from './CompanySection';
import { cn } from '../../../lib/utils';
import type { Customer } from '../../../data/mockData';
import { parseCustomersXlsx, mergeCustomers } from '../../../lib/customerImport';

export function CustomersSection() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    try {
      const rows = await parseCustomersXlsx(file);
      if (rows.length === 0) {
        toast.error('No se encontraron columnas "Cliente" y "RUT" en el archivo');
        return;
      }
      const report = mergeCustomers(customers, rows, {
        onAdd: addCustomer,
        onUpdate: updateCustomer,
      });
      toast.success(
        `Importación: ${report.added} agregados, ${report.updated} actualizados, ${report.skipped} sin cambios`,
      );
    } catch (err) {
      console.error(err);
      toast.error('Error al leer el archivo');
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.clientCode.toLowerCase().includes(q) ||
      c.contact.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleAdd = () => {
    const id = `c-${Date.now()}`;
    addCustomer({
      id,
      name: 'Nuevo cliente',
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
    });
    setExpandedId(id);
    toast.success('Cliente agregado');
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente "${name}"?`)) return;
    deleteCustomer(id);
    toast.success('Cliente eliminado');
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <SectionHeader
          title="Clientes"
          description={`${customers.length} en el catálogo`}
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-xl text-sm font-bold transition-all duration-150"
          >
            <Upload size={14} strokeWidth={2.3} /> Importar Excel
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl text-sm font-bold transition-all duration-150 shadow-viu-soft"
          >
            <Plus size={14} strokeWidth={2.3} /> Agregar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o contacto..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 py-12">Sin resultados</p>
        ) : (
          filtered.map((c) => (
            <CustomerRow
              key={c.id}
              customer={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onUpdate={updateCustomer}
              onDelete={() => handleDelete(c.id, c.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface CustomerRowProps {
  customer: Customer;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (c: Customer) => void;
  onDelete: () => void;
}

function CustomerRow({ customer, expanded, onToggle, onUpdate, onDelete }: CustomerRowProps) {
  const set = <K extends keyof Customer>(key: K, value: Customer[K]) => {
    onUpdate({ ...customer, [key]: value });
  };

  const segColor = customer.segment === 'A' ? 'bg-emerald-100 text-emerald-700' :
    customer.segment === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className={cn(
      'rounded-2xl border transition-colors',
      expanded ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-white hover:border-zinc-300'
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', segColor)}>{customer.segment}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{customer.name}</p>
          <p className="text-xs text-zinc-500">{customer.clientCode || '— sin código'} · {customer.type} · {customer.orderCount} órdenes</p>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SmallField label="Nombre">
                  <input value={customer.name} onChange={(e) => set('name', e.target.value)} className="input-sm" />
                </SmallField>
                <SmallField label="Código (3 letras)">
                  <input
                    value={customer.clientCode}
                    onChange={(e) => set('clientCode', e.target.value.toUpperCase().slice(0, 3))}
                    maxLength={3}
                    className="input-sm font-mono uppercase tracking-widest text-center"
                  />
                </SmallField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SmallField label="Segmento">
                  <div className="flex gap-1">
                    {(['A', 'B', 'C'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => set('segment', s)}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border',
                          customer.segment === s
                            ? s === 'A' ? 'bg-emerald-500 text-white border-emerald-500'
                              : s === 'B' ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-zinc-500 border-zinc-200'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </SmallField>
                <SmallField label="Tipo">
                  <select value={customer.type} onChange={(e) => set('type', e.target.value as Customer['type'])} className="input-sm">
                    <option>Recurrente</option>
                    <option>Esporádico</option>
                    <option>Complejo</option>
                  </select>
                </SmallField>
                <SmallField label="Correlativo inicial">
                  <input
                    type="number"
                    min="1"
                    value={customer.initialCorrelative}
                    onChange={(e) => set('initialCorrelative', parseInt(e.target.value) || 1)}
                    className="input-sm font-mono"
                  />
                </SmallField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SmallField label="RUT">
                  <input value={customer.rut} onChange={(e) => set('rut', e.target.value)} placeholder="12.345.678-9" className="input-sm" />
                </SmallField>
                <SmallField label="Encargado">
                  <input value={customer.projectManager} onChange={(e) => set('projectManager', e.target.value)} className="input-sm" />
                </SmallField>
              </div>
              <SmallField label="Contacto">
                <input value={customer.contact} onChange={(e) => set('contact', e.target.value)} placeholder="email@cliente.cl" className="input-sm" />
              </SmallField>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                  Eliminar cliente
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .input-sm { width: 100%; padding: 0.4375rem 0.75rem; background: white; border: 1px solid rgb(228 228 231); border-radius: 0.625rem; font-size: 0.8125rem; transition: all 0.15s; }
        .input-sm:focus { outline: none; border-color: #FFC72C; box-shadow: 0 0 0 3px rgba(255, 199, 44, 0.15); }
      `}</style>
    </div>
  );
}

function SmallField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
