import { useStore } from '../../../store/useStore';
import { SectionHeader, Field, Hint } from './CompanySection';
import { cn } from '../../../lib/utils';

export function PricingSection() {
  const { pricingConfig, updatePricingConfig } = useStore();

  return (
    <div className="p-8">
      <SectionHeader
        title="Precios y multiplicadores"
        description="Define cómo se calculan los precios sugeridos por el motor de cotización."
      />

      <div className="mt-8 space-y-8">
        {/* Segment multipliers */}
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Multiplicadores por segmento</h3>
          <p className="text-xs text-zinc-500 mb-4">Aplican al precio final del ítem según el segmento del cliente.</p>
          <div className="grid grid-cols-3 gap-3">
            {(['A', 'B', 'C'] as const).map((seg) => {
              const color = seg === 'A' ? 'emerald' : seg === 'B' ? 'blue' : 'amber';
              return (
                <div key={seg} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white',
                      color === 'emerald' && 'bg-emerald-500',
                      color === 'blue' && 'bg-blue-500',
                      color === 'amber' && 'bg-amber-500'
                    )}>
                      {seg}
                    </span>
                    <span className="text-xs font-semibold text-zinc-700">Segmento {seg}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">×</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pricingConfig.segmentMultipliers[seg]}
                      onChange={(e) => updatePricingConfig({
                        segmentMultipliers: {
                          ...pricingConfig.segmentMultipliers,
                          [seg]: parseFloat(e.target.value) || 0,
                        },
                      })}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Labor */}
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Mano de obra</h3>
          <p className="text-xs text-zinc-500 mb-4">Tarifa horaria y multiplicadores por turnos especiales.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="CLP por hora">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.laborHourRate}
                  onChange={(e) => updatePricingConfig({ laborHourRate: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-6 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
            </Field>
            <Field label="Recargo horas extra">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">×</span>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={pricingConfig.overtimeMultiplier}
                  onChange={(e) => updatePricingConfig({ overtimeMultiplier: parseFloat(e.target.value) || 1 })}
                  className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              <Hint>1.5 = +50%</Hint>
            </Field>
            <Field label="Recargo fin de semana">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">×</span>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={pricingConfig.weekendMultiplier}
                  onChange={(e) => updatePricingConfig({ weekendMultiplier: parseFloat(e.target.value) || 1 })}
                  className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              <Hint>1.25 = +25%</Hint>
            </Field>
          </div>
        </div>

        {/* Order-level fees */}
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Cargos de orden</h3>
          <p className="text-xs text-zinc-500 mb-4">Valores fijos que se suman al total.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Despacho (CLP)">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.despachoCost}
                  onChange={(e) => updatePricingConfig({ despachoCost: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-6 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
            </Field>
            <Field label="Instalación sugerida (CLP)">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.instalacionDefault}
                  onChange={(e) => updatePricingConfig({ instalacionDefault: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-6 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              <Hint>Valor por defecto si se marca "Requiere instalación"</Hint>
            </Field>
            <Field label="Días de entrega">
              <input
                type="number"
                min="1"
                value={pricingConfig.deliveryLeadDays}
                onChange={(e) => updatePricingConfig({ deliveryLeadDays: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
              <Hint>Tiempo estimado desde la creación</Hint>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
