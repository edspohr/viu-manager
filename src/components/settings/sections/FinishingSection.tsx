import { useStore } from '../../../store/useStore';
import { SectionHeader, Field } from './CompanySection';

export function FinishingSection() {
  const { pricingConfig, updatePricingConfig } = useStore();

  const updateMultiplier = (key: string, value: number) => {
    updatePricingConfig({
      finishingMultipliers: { ...pricingConfig.finishingMultipliers, [key]: value },
    });
  };

  const updateAddon = (key: string, value: number) => {
    updatePricingConfig({
      finishingAddons: { ...pricingConfig.finishingAddons, [key]: value },
    });
  };

  return (
    <div className="p-8">
      <SectionHeader
        title="Terminaciones"
        description="Define multiplicadores que escalan el costo base y addons que se suman por unidad."
      />

      <div className="mt-8 space-y-8">
        {/* Multipliers */}
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Multiplicadores</h3>
          <p className="text-xs text-zinc-500 mb-4">Aplican sobre el costo base + mano de obra del ítem.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(pricingConfig.finishingMultipliers).map(([key, value]) => (
              <Field key={key} label={key}>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">×</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={value}
                    onChange={(e) => updateMultiplier(key, parseFloat(e.target.value) || 1)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
              </Field>
            ))}
          </div>
        </div>

        {/* Addons */}
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Addons por unidad</h3>
          <p className="text-xs text-zinc-500 mb-4">Se suman al precio por cada unidad del ítem.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(pricingConfig.finishingAddons).map(([key, value]) => (
              <Field key={key} label={key}>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => updateAddon(key, parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
              </Field>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
