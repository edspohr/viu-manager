import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { SectionHeader } from './CompanySection';
import { cn } from '../../../lib/utils';
import { formatCLP } from '../../../lib/formatters';
import { getEffectivePrice } from '../../../lib/quoteEngine';
import { Skeleton } from '../../ui/Skeleton';
import type { Material } from '../../../data/mockData';

export function MaterialsSection() {
  const { materials, addMaterial, updateMaterials, deleteMaterial } = useStore();
  const hasHydrated = useStore((s) => s.hasHydratedFromFirestore);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'Rígido' | 'Flexible'>('all');

  const filtered = useMemo(() => {
    let result = materials;
    if (typeFilter !== 'all') result = result.filter((m) => m.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.brand ?? '').toLowerCase().includes(q) ||
          (m.supplierCode ?? '').toLowerCase().includes(q) ||
          (m.category ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [materials, search, typeFilter]);

  const handleAdd = () => {
    const id = `m-${Date.now()}`;
    addMaterial({
      id,
      name: 'Nuevo material',
      type: 'Flexible',
      stock: 0,
      unit: 'm',
      supplier1Price: 1000,
      supplier2Price: 0,
      supplier3Price: 0,
      activeSupplier: 1,
    });
    setExpandedId(id);
    toast.success('Material agregado');
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar material "${name}"?`)) return;
    deleteMaterial(id);
    toast.success('Material eliminado');
  };

  const updateOne = (mat: Material) => {
    updateMaterials(materials.map((m) => (m.id === mat.id ? mat : m)));
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <SectionHeader
          title="Materiales"
          description={`${materials.length} en el catálogo`}
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl text-sm font-bold transition-all duration-150 shadow-viu-soft"
        >
          <Plus size={14} strokeWidth={2.3} /> Agregar
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
          {(['all', 'Rígido', 'Flexible'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                typeFilter === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {t === 'all' ? 'Todos' : t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {!hasHydrated && materials.length === 0 ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 py-12">Sin resultados</p>
        ) : (
          filtered.map((m) => (
            <MaterialRow
              key={m.id}
              material={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              onUpdate={updateOne}
              onDelete={() => handleDelete(m.id, m.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Material row ────────────────────────────────────────────────────────────

interface MaterialRowProps {
  material: Material;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (m: Material) => void;
  onDelete: () => void;
}

function MaterialRow({ material, expanded, onToggle, onUpdate, onDelete }: MaterialRowProps) {
  const set = <K extends keyof Material>(key: K, value: Material[K]) => {
    onUpdate({ ...material, [key]: value });
  };

  const effective = getEffectivePrice(material);

  return (
    <div className={cn(
      'rounded-2xl border bg-white transition-colors',
      expanded ? 'border-zinc-300' : 'border-zinc-200 hover:border-zinc-300'
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-bold',
          material.type === 'Rígido' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
        )}>
          {material.type === 'Rígido' ? 'R' : 'F'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{material.name}</p>
          <p className="text-xs text-zinc-500 truncate">
            {[material.brand, material.category, material.supplierCode, `${material.type} · ${material.unit}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Activo</p>
          <p className="font-mono text-sm font-semibold text-zinc-900">{formatCLP(effective)}</p>
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
                  <input value={material.name} onChange={(e) => set('name', e.target.value)} className="input-mat" />
                </SmallField>
                <SmallField label="Tipo">
                  <select
                    value={material.type}
                    onChange={(e) => {
                      const type = e.target.value as Material['type'];
                      onUpdate({ ...material, type, unit: type === 'Rígido' ? 'planchas' : 'm' });
                    }}
                    className="input-mat"
                  >
                    <option>Rígido</option>
                    <option>Flexible</option>
                  </select>
                </SmallField>
              </div>

              {(material.supplierCode || material.brand || material.category) && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {material.brand && (
                    <div><span className="text-zinc-400">Marca</span><br /><span className="font-semibold text-zinc-700">{material.brand}</span></div>
                  )}
                  {material.category && (
                    <div><span className="text-zinc-400">Categoría</span><br /><span className="font-semibold text-zinc-700">{material.category}</span></div>
                  )}
                  {material.supplierCode && (
                    <div className="col-span-2 sm:col-span-1"><span className="text-zinc-400">Código</span><br /><span className="font-mono text-zinc-700 break-all">{material.supplierCode}</span></div>
                  )}
                  {material.unitMode && (
                    <div><span className="text-zinc-400">Unidad</span><br /><span className="font-semibold text-zinc-700">{material.unitMode === 'per_plancha' ? 'CLP/plancha' : material.unitMode === 'per_m2' ? 'CLP/m²' : 'CLP/rollo'}</span></div>
                  )}
                  {material.unitMode === 'per_roll' && material.rollWidth && material.rollLength && (
                    <div className="col-span-2 sm:col-span-2"><span className="text-zinc-400">Rollo</span><br /><span className="font-mono text-zinc-700">{material.rollWidth}m × {material.rollLength}m</span></div>
                  )}
                  {material.unitMode === 'per_m2' && material.rollWidth && material.rollLength && (
                    <div className="col-span-2 sm:col-span-2"><span className="text-zinc-400">Rollo ref.</span><br /><span className="font-mono text-zinc-700">{material.rollWidth}m × {material.rollLength}m</span></div>
                  )}
                </div>
              )}

              {/* Supplier prices */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Proveedores</p>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((slot) => {
                    const key = `supplier${slot}Price` as const;
                    const isActive = material.activeSupplier === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => set('activeSupplier', slot)}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all duration-150',
                          isActive ? 'border-viu-500 bg-viu-50 ring-4 ring-viu-500/15' : 'border-zinc-200 hover:border-zinc-300'
                        )}
                      >
                        <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isActive ? 'text-viu-900' : 'text-zinc-400')}>
                          Proveedor {slot}
                        </p>
                        <div className="relative">
                          <span className={cn('absolute left-1 top-1/2 -translate-y-1/2 text-xs', isActive ? 'text-viu-900' : 'text-zinc-400')}>$</span>
                          <input
                            type="number"
                            min="0"
                            value={material[key]}
                            onChange={(e) => onUpdate({ ...material, [key]: parseFloat(e.target.value) || 0 })}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              'w-full pl-4 pr-1 py-0.5 bg-transparent text-sm font-mono focus:outline-none',
                              isActive ? 'text-ink font-semibold' : 'text-zinc-900'
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => set('activeSupplier', 'average')}
                  className={cn(
                    'mt-2 w-full px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    material.activeSupplier === 'average'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  )}
                >
                  Usar promedio
                </button>
              </div>

              {material.type === 'Rígido' && (
                <div className="grid grid-cols-3 gap-3">
                  <SmallField label="Plancha ancho (cm)">
                    <input
                      type="number"
                      value={material.sheetWidth ?? 120}
                      onChange={(e) => set('sheetWidth', parseFloat(e.target.value) || 0)}
                      className="input-mat font-mono"
                    />
                  </SmallField>
                  <SmallField label="Plancha alto (cm)">
                    <input
                      type="number"
                      value={material.sheetHeight ?? 240}
                      onChange={(e) => set('sheetHeight', parseFloat(e.target.value) || 0)}
                      className="input-mat font-mono"
                    />
                  </SmallField>
                  <SmallField label="Precio mínimo (CLP)">
                    <input
                      type="number"
                      value={material.minPrice ?? 0}
                      onChange={(e) => set('minPrice', parseFloat(e.target.value) || 0)}
                      className="input-mat font-mono"
                    />
                  </SmallField>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                  Eliminar material
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .input-mat { width: 100%; padding: 0.4375rem 0.75rem; background: white; border: 1px solid rgb(228 228 231); border-radius: 0.625rem; font-size: 0.8125rem; transition: all 0.15s; }
        .input-mat:focus { outline: none; border-color: #FFC72C; box-shadow: 0 0 0 3px rgba(255, 199, 44, 0.15); }
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
