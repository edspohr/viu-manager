import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Customer } from '../../data/mockData';

interface NewClientPromptProps {
  detectedName: string;
  existingCustomers: Customer[];
  onCreateNew: (customer: Omit<Customer, 'id'>) => void;
  onLinkExisting: (customerId: string) => void;
  onDismiss: () => void;
}

const CUSTOMER_TYPES: Customer['type'][] = ['Recurrente', 'Esporádico', 'Complejo'];

export function NewClientPrompt({
  detectedName, existingCustomers, onCreateNew, onLinkExisting, onDismiss,
}: NewClientPromptProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'link'>('choose');
  const [name, setName] = useState(detectedName);
  const [type, setType] = useState<Customer['type']>('Esporádico');
  const [contact, setContact] = useState('');
  const [linkId, setLinkId] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateNew({ name: name.trim(), type, contact, debt: 0 });
  };

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
            <h3 className="font-bold text-zinc-900">Cliente detectado</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              "<span className="font-medium text-zinc-700">{detectedName}</span>" no existe en el catálogo
            </p>
          </div>
          <button onClick={onDismiss} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center gap-4 p-4 border-2 border-zinc-200 hover:border-zinc-900 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                  <UserPlus size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">Crear nuevo cliente</p>
                  <p className="text-xs text-zinc-500">Agregar "{detectedName}" al catálogo</p>
                </div>
              </button>

              <button
                onClick={() => setMode('link')}
                className="w-full flex items-center gap-4 p-4 border-2 border-zinc-200 hover:border-zinc-900 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors">
                  <Users size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">Vincular a cliente existente</p>
                  <p className="text-xs text-zinc-500">Es un nombre alternativo de un cliente ya registrado</p>
                </div>
              </button>

              <button
                onClick={onDismiss}
                className="w-full py-2.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Continuar sin cambios
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Nombre</label>
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
                  {CUSTOMER_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                        type === t
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Contacto (opcional)</label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email o teléfono"
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors placeholder:text-zinc-300"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode('choose')} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors">
                  Atrás
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  Crear cliente
                </button>
              </div>
            </div>
          )}

          {mode === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Seleccionar cliente</label>
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
                  autoFocus
                >
                  <option value="">Elegir cliente...</option>
                  {existingCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode('choose')} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 transition-colors">
                  Atrás
                </button>
                <button
                  onClick={() => linkId && onLinkExisting(linkId)}
                  disabled={!linkId}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  Vincular
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
