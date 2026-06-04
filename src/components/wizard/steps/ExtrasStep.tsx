import { Wrench, Calendar, Zap, Split } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCLP } from '../../../lib/formatters';
import type { WizardState } from '../AIQuoteWizard';

interface ExtrasStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

export function ExtrasStep({ state, update }: ExtrasStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Detalles finales</h3>
        <p className="text-sm text-zinc-500">Información de campaña, entrega y cargos adicionales.</p>
      </div>

      {/* Campaign + event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre de campaña" required>
          <input
            value={state.campaignName}
            onChange={(e) => update({ campaignName: e.target.value })}
            placeholder="Ej. Lanzamiento Verano"
            className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
        <Field label="Nombre del evento">
          <input
            value={state.eventName}
            onChange={(e) => update({ eventName: e.target.value })}
            placeholder="Opcional"
            className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </Field>
      </div>

      <Field label="Fecha de entrega estimada" required>
        <div className="relative">
          <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="date"
            value={state.deliveryDate}
            onChange={(e) => update({ deliveryDate: e.target.value })}
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </div>
      </Field>

      {/* Toggles */}
      <div className="space-y-3">
        <ToggleCard
          icon={Wrench}
          title="Requiere instalación"
          description="Agrega un cargo fijo por instalación al total."
          enabled={state.requiresInstallation}
          onToggle={(v) => update({ requiresInstallation: v })}
        >
          {state.requiresInstallation && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Cargo de instalación (CLP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={state.installationFee || ''}
                  onChange={(e) => update({ installationFee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full max-w-[200px] pl-7 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              {state.installationFee > 0 && (
                <p className="text-xs text-emerald-600 mt-1.5 font-mono">+ {formatCLP(state.installationFee)}</p>
              )}
            </div>
          )}
        </ToggleCard>

        <ToggleCard
          icon={Zap}
          title="Recargo fin de semana"
          description="Aplica multiplicador a la mano de obra por trabajo en fin de semana."
          enabled={state.weekendSurcharge}
          onToggle={(v) => update({ weekendSurcharge: v })}
        />

        <ToggleCard
          icon={Split}
          title="Dividir cotización"
          description="Separa los ítems en dos partes (A y B) con subtotales independientes."
          enabled={state.isSplitQuote}
          onToggle={(v) => {
            if (!v) update({ isSplitQuote: false, splitAssignments: new Map() });
            else update({ isSplitQuote: true });
          }}
        >
          {state.isSplitQuote && state.items.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Asigna cada ítem</p>
              {state.items.map((_, idx) => {
                const assignment = state.splitAssignments.get(idx) ?? 'A';
                return (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-zinc-100">
                    <span className="text-xs font-mono text-zinc-400 w-6">#{idx + 1}</span>
                    <span className="text-xs text-zinc-600 flex-1 truncate">{state.items[idx].width}×{state.items[idx].height} cm</span>
                    <div className="flex gap-1">
                      {(['A', 'B'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            const next = new Map(state.splitAssignments);
                            next.set(idx, p);
                            update({ splitAssignments: next });
                          }}
                          className={cn(
                            'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                            assignment === p ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ToggleCard>
      </div>
    </div>
  );
}

// ─── Toggle card ─────────────────────────────────────────────────────────────

interface ToggleCardProps {
  icon: typeof Wrench;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}

function ToggleCard({ icon: Icon, title, description, enabled, onToggle, children }: ToggleCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border transition-colors p-5',
      enabled ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          enabled ? 'bg-white/10' : 'bg-zinc-100'
        )}>
          <Icon size={16} className={enabled ? 'text-white' : 'text-zinc-600'} />
        </div>
        <div className="flex-1">
          <p className={cn('text-sm font-semibold', enabled ? 'text-white' : 'text-zinc-900')}>{title}</p>
          <p className={cn('text-xs mt-0.5', enabled ? 'text-zinc-300' : 'text-zinc-500')}>{description}</p>
        </div>
        <Switch enabled={enabled} onChange={onToggle} />
      </div>
      {children && enabled && (
        <div className="pt-3 mt-3 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

function Switch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-10 h-6 rounded-full transition-colors shrink-0',
        enabled ? 'bg-emerald-400' : 'bg-zinc-200'
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
        enabled && 'translate-x-4'
      )} />
    </button>
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
