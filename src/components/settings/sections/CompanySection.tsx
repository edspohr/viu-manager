import { useStore } from '../../../store/useStore';

export function CompanySection() {
  const { pricingConfig, updatePricingConfig } = useStore();

  return (
    <div className="p-8">
      <SectionHeader
        title="Datos de empresa"
        description="Aparecen en el PDF de cotización enviado al cliente."
      />

      <div className="space-y-4 mt-6">
        <Field label="RUT empresa">
          <input
            value={pricingConfig.empresaRut}
            onChange={(e) => updatePricingConfig({ empresaRut: e.target.value })}
            placeholder="76.123.456-7"
            className="input"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input
              value={pricingConfig.empresaPhone}
              onChange={(e) => updatePricingConfig({ empresaPhone: e.target.value })}
              placeholder="+56 2 1234 5678"
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={pricingConfig.empresaEmail}
              onChange={(e) => updatePricingConfig({ empresaEmail: e.target.value })}
              placeholder="contacto@viuprint.cl"
              className="input"
            />
          </Field>
        </div>

        <Field label="Datos bancarios">
          <textarea
            value={pricingConfig.bankDetails}
            onChange={(e) => updatePricingConfig({ bankDetails: e.target.value })}
            placeholder={'Banco: ...\nCuenta: ...\nRUT: ...\nEmail: ...'}
            rows={5}
            className="input resize-none font-mono text-xs"
          />
          <Hint>Aparecerán en el pie del PDF de cotización.</Hint>
        </Field>
      </div>

      <style>{`
        .input { width: 100%; padding: 0.625rem 0.875rem; background: white; border: 1px solid rgb(228 228 231); border-radius: 0.75rem; font-size: 0.875rem; transition: all 0.15s; }
        .input:focus { outline: none; border-color: #FFC72C; box-shadow: 0 0 0 4px rgba(255, 199, 44, 0.15); }
      `}</style>
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
      <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
    </div>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-zinc-400 mt-1">{children}</p>;
}
