import { useMemo } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCLP } from '../../../lib/formatters';
import { calculateItemPrice } from '../../../lib/quoteEngine';
import type { WizardState } from '../AIQuoteWizard';
import type { Material, PricingConfig, Customer, OrderItem } from '../../../data/mockData';

interface ItemsStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  materials: Material[];
  pricingConfig: PricingConfig;
  customers: Customer[];
}

const FINISHING_OPTIONS = [
  'Corte Recto', 'Troquelado', 'Corte CNC', 'Tiro y Retiro', 'Corte Contorno',
  'Ojetillos', 'Pie de Apoyo', 'Bolsillo Superior', 'Refuerzo', 'Instalación',
];

export function ItemsStep({ state, update, materials, pricingConfig, customers }: ItemsStepProps) {
  const customer = customers.find((c) => c.id === state.customerId);
  const segMult = customer ? pricingConfig.segmentMultipliers[customer.segment] : 2.0;

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const recalcItem = (item: OrderItem): OrderItem => {
    const mat = materialMap.get(item.materialId);
    if (!mat) {
      return { ...item, suggestedUnitPrice: 0, unitPrice: 0, subtotal: 0 };
    }
    const calc = calculateItemPrice(item, mat, pricingConfig, segMult, 0, state.weekendSurcharge);
    return calc;
  };

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    const next = state.items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      return recalcItem(merged);
    });
    update({ items: next });
  };

  const removeItem = (idx: number) => {
    update({ items: state.items.filter((_, i) => i !== idx) });
  };

  const addItem = () => {
    const blank: OrderItem = {
      materialId: materials[0]?.id ?? '',
      width: 100,
      height: 100,
      quantity: 1,
      finishing: [],
      doubleSided: false,
      suggestedUnitPrice: 0,
      unitPrice: 0,
      subtotal: 0,
      calculationBreakdown: {
        baseCost: 0, laborCost: 0, finishingMultiplier: 1,
        finishingAddons: 0, segmentMultiplier: 1,
      },
    };
    update({ items: [...state.items, recalcItem(blank)] });
  };

  // Ensure all items have current calculated prices on first mount of this step
  useMemo(() => {
    if (state.items.some((it) => it.suggestedUnitPrice === 0 && materialMap.has(it.materialId))) {
      const recalced = state.items.map(recalcItem);
      update({ items: recalced });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = state.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Revisa los ítems</h3>
        <p className="text-sm text-zinc-500">
          Ajusta dimensiones, cantidades, terminaciones y precios sugeridos por la IA.
        </p>
      </div>

      <div className="space-y-3">
        {state.items.map((item, idx) => (
          <ItemRow
            key={idx}
            item={item}
            idx={idx}
            materials={materials}
            onUpdate={(patch) => updateItem(idx, patch)}
            onRemove={() => removeItem(idx)}
          />
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-zinc-200 hover:border-zinc-400 text-zinc-500 hover:text-zinc-900 rounded-xl text-sm font-medium transition-colors"
      >
        <Plus size={14} />
        Agregar ítem manual
      </button>

      {/* Subtotal */}
      {state.items.length > 0 && (
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
          <span className="text-sm font-medium text-zinc-700">Subtotal ítems</span>
          <span className="font-mono font-bold text-lg text-zinc-900">{formatCLP(subtotal)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Item row ────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: OrderItem;
  idx: number;
  materials: Material[];
  onUpdate: (patch: Partial<OrderItem>) => void;
  onRemove: () => void;
}

function ItemRow({ item, idx, materials, onUpdate, onRemove }: ItemRowProps) {
  const mat = materials.find((m) => m.id === item.materialId);

  const toggleFinishing = (f: string) => {
    const next = item.finishing.includes(f)
      ? item.finishing.filter((x) => x !== f)
      : [...item.finishing, f];
    onUpdate({ finishing: next });
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
      {/* Top row: index + material + remove */}
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs font-bold">
          {idx + 1}
        </span>
        <select
          value={item.materialId}
          onChange={(e) => onUpdate({ materialId: e.target.value })}
          className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
        >
          {!mat && <option value={item.materialId}>{item.materialId}</option>}
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-4 gap-2">
        <Field label="Ancho (cm)">
          <input
            type="number"
            value={item.width}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
        <Field label="Alto (cm)">
          <input
            type="number"
            value={item.height}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
        <Field label="Cantidad">
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
        <Field label="Doble cara">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg cursor-pointer hover:border-zinc-300 transition-colors">
            <input
              type="checkbox"
              checked={item.doubleSided}
              onChange={(e) => onUpdate({ doubleSided: e.target.checked })}
              className="w-3.5 h-3.5 accent-zinc-900"
            />
            <span className="text-xs text-zinc-600">Sí</span>
          </label>
        </Field>
      </div>

      {/* Finishing */}
      <Field label="Terminaciones">
        <div className="flex flex-wrap gap-1.5">
          {FINISHING_OPTIONS.map((f) => {
            const active = item.finishing.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFinishing(f)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                  active
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Price */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-100">
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Sugerido IA</p>
          <p className="text-xs text-zinc-500 font-mono">{formatCLP(item.suggestedUnitPrice)}</p>
        </div>
        <Field label="Precio unitario manual">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
            <input
              type="number"
              value={item.unitPrice || ''}
              onChange={(e) => {
                const unitPrice = parseFloat(e.target.value) || 0;
                onUpdate({ unitPrice, subtotal: unitPrice * item.quantity });
              }}
              className="w-36 pl-7 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>
        </Field>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Subtotal</p>
          <p className="font-mono font-bold text-zinc-900">{formatCLP(item.subtotal)}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
