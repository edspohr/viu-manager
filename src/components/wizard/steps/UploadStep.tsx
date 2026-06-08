import { useRef } from 'react';
import { Sparkles, Upload, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { WizardState } from '../AIQuoteWizard';

interface UploadStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  onAnalyze: () => void;
  analyzing: boolean;
}

export function UploadStep({ state, update, onAnalyze, analyzing }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    update({ files: [...state.files, ...Array.from(newFiles)] });
    // Reset the input so re-selecting the same file (after removal) fires onChange again.
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    update({ files: state.files.filter((_, i) => i !== idx) });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const canAnalyze = !analyzing && (state.emailText.trim().length > 0 || state.files.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Sube los documentos del cliente</h3>
        <p className="text-sm text-zinc-500">
          La IA analizará el contenido para detectar ítems, dimensiones, materiales y cliente.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => state.files.length === 0 && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed border-zinc-200 p-10 transition-all duration-200',
          state.files.length === 0 && 'cursor-pointer hover:border-viu-500 hover:bg-viu-50/30 group'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />

        {state.files.length === 0 ? (
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="absolute inset-0 bg-viu-500/20 blur-xl rounded-full group-hover:bg-viu-500/30 transition-all" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-viu-100 to-viu-50 ring-1 ring-viu-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Upload size={22} className="text-viu-700" strokeWidth={2.2} />
              </div>
            </div>
            <p className="text-sm font-semibold text-ink">Arrastra archivos aquí o haz clic para elegirlos</p>
            <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG, Excel (.xlsx/.xls), CSV · Solicitudes, briefs, planillas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.files.map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 rounded-xl">
                <FileText size={15} className="text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 truncate">{f.name}</p>
                  <p className="text-xs text-zinc-400">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="p-1 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X size={13} className="text-zinc-500" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full mt-2 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              + Agregar más archivos
            </button>
          </div>
        )}
      </div>

      {/* Optional text */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          O pega el texto de la solicitud (opcional)
        </label>
        <textarea
          value={state.emailText}
          onChange={(e) => update({ emailText: e.target.value })}
          placeholder="Pega aquí el correo o briefing del cliente..."
          rows={5}
          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
        />
      </div>

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={!canAnalyze}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 text-ink rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-viu-soft hover:shadow-md"
      >
        {analyzing ? (
          <>
            <Loader2 size={15} className="animate-spin" strokeWidth={2.5} />
            Gemini 2.5 analizando...
          </>
        ) : (
          <>
            <Sparkles size={15} strokeWidth={2.3} />
            Analizar con IA
          </>
        )}
      </button>
    </div>
  );
}
