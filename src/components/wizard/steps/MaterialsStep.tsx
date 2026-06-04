import { useState } from 'react';
import { Package, Link2, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCLP } from '../../../lib/formatters';
import type { WizardState } from '../AIQuoteWizard';
import type { Material } from '../../../data/mockData';

interface MaterialsStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  materials: Material[];
}

export function MaterialsStep({ state, update, materials }: MaterialsStepProps) {
  const unknowns = state.extraction?.unknownMaterials ?? [];

  if (unknowns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 mx-auto flex items-center justify-center mb-3">
          <Check size={22} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Todos los materiales reconocidos</h3>
        <p className="text-sm text-zinc-500">No hay materiales nuevos que decidir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">
          {unknowns.length === 1 ? 'Material desconocido' : `${unknowns.length} materiales desconocidos`}
        </h3>
        <p className="text-sm text-zinc-500">
          Para cada uno, mapéalo a uno existente o agrégalo al catálogo con su costo inicial.
        </p>
      </div>

      <div className="space-y-4">
        {unknowns.map((name) => (
          <UnknownMaterialCard
            key={name}
            name={name}
            decision={state.materialDecisions.get(name)}
            materials={materials}
            onDecide={(decision) => {
              const next = new Map(state.materialDecisions);
              next.set(name, decision);
              update({ materialDecisions: next });
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Per-material card ──────────────────────────────────────────────────────

type Decision =
  | { kind: 'existing'; id: string }
  | { kind: 'new'; data: Omit<Material, 'id'> };

interface UnknownMaterialCardProps {
  name: string;
  decision: Decision | undefined;
  materials: Material[];
  onDecide: (d: Decision) => void;
}

function UnknownMaterialCard({ name, decision, materials, onDecide }: UnknownMaterialCardProps) {
  const [mode, setMode] = useState<'choose' | 'add' | 'map'>(
    decision?.kind === 'existing' ? 'map' : decision?.kind === 'new' ? 'add' : 'choose'
  );

  return (
    <div className={cn(
      'border rounded-2xl overflow-hidden transition-colors',
      decision ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white'
    )}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Detectado</p>
          <p className="font-semibold text-zinc-900 mt-0.5">"{name}"</p>
        </div>
        {decision && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
            <Check size={12} />
            Decidido
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('add')}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                <Package size={15} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Agregar nuevo</p>
                <p className="text-[11px] text-zinc-500">Crear en catálogo</p>
              </div>
            </button>
            <button
              onClick={() => setMode('map')}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                <Link2 size={15} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Mapear existente</p>
                <p className="text-[11px] text-zinc-500">Alias de otro material</p>
              </div>
            </button>
          </div>
        )}

        {mode === 'add' && (
          <AddMaterialForm
            name={name}
            existing={decision?.kind === 'new' ? decision.data : null}
            onSave={(data) => onDecide({ kind: 'new', data })}
            onBack={() => setMode('choose')}
          />
        )}

        {mode === 'map' && (
          <MapMaterialForm
            materials={materials}
            existing={decision?.kind === 'existing' ? decision.id : ''}
            onSave={(id) => onDecide({ kind: 'existing', id })}
            onBack={() => setMode('choose')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Add new material form ──────────────────────────────────────────────────

function AddMaterialForm({
  name, existing, onSave, onBack,
}: {
  name: string;
  existing: Omit<Material, 'id'> | null;
  onSave: (data: Omit<Material, 'id'>) => void;
  onBack: () => void;
}) {
  const [matName, setMatName] = useState(existing?.name ?? name);
  const [type, setType] = useState<Material['type']>(existing?.type ?? 'Flexible');
  const [initialCost, setInitialCost] = useState(existing?.supplier1Price ?? 0);

  const canSave = matName.trim().length > 0 && initialCost > 0;

  const handleSave = () => {
    if (!canSave) return;
    const data: Omit<Material, 'id'> = {
      name: matName.trim(),
      type,
      stock: 0,
      unit: type === 'Rígido' ? 'planchas' : 'm',
      supplier1Price: initialCost,
      supplier2Price: 0,
      supplier3Price: 0,
      activeSupplier: 1,
      ...(type === 'Rígido' ? { sheetWidth: 120, sheetHeight: 240, minPrice: 1500 } : {}),
    };
    onSave(data);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Nombre</label>
        <input
          value={matName}
          onChange={(e) => setMatName(e.target.value)}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tipo</label>
        <div className="flex gap-2">
          {(['Rígido', 'Flexible'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                type === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
          Costo inicial (CLP) <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
          <input
            type="number"
            min="1"
            value={initialCost || ''}
            onChange={(e) => setInitialCost(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className={cn(
              'w-full pl-7 pr-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 transition-all',
              initialCost <= 0
                ? 'border-rose-300 focus:ring-rose-200'
                : 'border-zinc-200 focus:ring-zinc-900 focus:border-transparent'
            )}
          />
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {type === 'Rígido' ? 'CLP por plancha' : 'CLP por metro lineal'}
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors"
        >
          Atrás
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 transition-all"
        >
          Guardar material
        </button>
      </div>
    </div>
  );
}

// ─── Map to existing material ───────────────────────────────────────────────

function MapMaterialForm({
  materials, existing, onSave, onBack,
}: {
  materials: Material[];
  existing: string;
  onSave: (id: string) => void;
  onBack: () => void;
}) {
  const [id, setId] = useState(existing);
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Material equivalente</label>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        >
          <option value="">Seleccionar...</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.type}) — {formatCLP(m.supplier1Price)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors"
        >
          Atrás
        </button>
        <button
          onClick={() => id && onSave(id)}
          disabled={!id}
          className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 transition-all"
        >
          Mapear
        </button>
      </div>
    </div>
  );
}
