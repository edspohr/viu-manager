import { useState } from 'react';
import { Building2, DollarSign, Layers, Users, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CompanySection } from './sections/CompanySection';
import { PricingSection } from './sections/PricingSection';
import { FinishingSection } from './sections/FinishingSection';
import { CustomersSection } from './sections/CustomersSection';
import { MaterialsSection } from './sections/MaterialsSection';

type SettingsSection = 'company' | 'pricing' | 'finishing' | 'customers' | 'materials';

const SECTIONS: { id: SettingsSection; label: string; description: string; icon: typeof Building2 }[] = [
  { id: 'company', label: 'Empresa', description: 'Datos para PDF y banco', icon: Building2 },
  { id: 'pricing', label: 'Precios', description: 'Multiplicadores y costos base', icon: DollarSign },
  { id: 'finishing', label: 'Terminaciones', description: 'Multiplicadores y addons', icon: Layers },
  { id: 'customers', label: 'Clientes', description: 'Catálogo y segmentos', icon: Users },
  { id: 'materials', label: 'Materiales', description: 'Catálogo de materiales', icon: Package },
];

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('company');

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-8">
        <h1 className="text-display tracking-tightest text-ink">Configuración</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-lg">Parámetros del sistema, catálogos y datos de empresa.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left nav */}
        <aside className="col-span-12 lg:col-span-3">
          <nav className="space-y-1 sticky top-6">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'group w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150',
                    active
                      ? 'bg-ink text-white shadow-soft'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    active ? 'bg-viu-500/15 text-viu-500' : 'bg-zinc-100 text-zinc-500 group-hover:bg-white'
                  )}>
                    <Icon size={14} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-ink')}>{s.label}</p>
                    <p className={cn('text-[11px] mt-0.5', active ? 'text-zinc-400' : 'text-zinc-500')}>{s.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Section content */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-card overflow-hidden">
            {section === 'company' && <CompanySection />}
            {section === 'pricing' && <PricingSection />}
            {section === 'finishing' && <FinishingSection />}
            {section === 'customers' && <CustomersSection />}
            {section === 'materials' && <MaterialsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
