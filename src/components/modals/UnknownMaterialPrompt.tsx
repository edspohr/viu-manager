import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Link2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Material } from '../../data/mockData';

interface UnknownMaterialPromptProps {
  unknownName: string;
  remaining: number;        // how many more unknown materials after this one
  existingMaterials: Material[];
  onAddNew: (name: string, type: 'Rígido' | 'Flexible') => void;
  onMapExisting: (materialId: string) => void;
  onSkip: () => void;
}

export function UnknownMaterialPrompt({
  unknownName, remaining, existingMaterials, onAddNew, onMapExisting, onSkip,
}: UnknownMaterialPromptProps) {
  const [mode, setMode] = useState<'choose' | 'add' | 'map'>('choose');
  const [name, setName] = useState(unknownName);
  const [matType, setMatType] = useState<'Rígido' | 'Flexible'>('Flexible');
  const [mapId, setMapId] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-900">Material desconocido</h3>
              {remaining > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                  +{remaining} más
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              "<span className="font-medium text-zinc-700">{unknownName}</span>" no está en el catálogo
            </p>
          </div>
          <button onClick={onSkip} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('add')}
                className="w-full flex items-center gap-4 p-4 border-2 border-zinc-200 hover:border-zinc-900 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                  <Package size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">Agregar al catálogo</p>
                  <p className="text-xs text-zinc-500">Crear "{unknownName}" como nuevo material</p>
                </div>
              </button>

              <button
                onClick={() => setMode('map')}
                className="w-full flex items-center gap-4 p-4 border-2 border-zinc-200 hover:border-zinc-900 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                  <Link2 size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">Mapear a material existente</p>
                  <p className="text-xs text-zinc-500">Es un nombre alternativo de un material en catálogo</p>
                </div>
              </button>

              <button
                onClick={onSkip}
                className="w-full py-2.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Omitir — revisar manualmente
              </button>
            </div>
          )}

          {mode === 'add' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Nombre del material</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Tipo</label>
                <div className="flex gap-2">
                  {(['Rígido', 'Flexible'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setMatType(t)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        matType === t
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Se agregará con precio = 0. Configura el precio en Administración → Configuración.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode('choose')} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors">
                  Atrás
                </button>
                <button
                  onClick={() => name.trim() && onAddNew(name.trim(), matType)}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  Agregar material
                </button>
              </div>
            </div>
          )}

          {mode === 'map' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Material equivalente</label>
                <select
                  value={mapId}
                  onChange={(e) => setMapId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
                  autoFocus
                >
                  <option value="">Seleccionar material...</option>
                  {existingMaterials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode('choose')} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors">
                  Atrás
                </button>
                <button
                  onClick={() => mapId && onMapExisting(mapId)}
                  disabled={!mapId}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  Mapear
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
