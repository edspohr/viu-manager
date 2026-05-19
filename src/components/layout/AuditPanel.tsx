import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, ArrowRight, DollarSign, Filter } from 'lucide-react';
import { useStore, type PriceChangeLog, type StatusChangeLog } from '../../store/useStore';
import { formatCLP } from '../../lib/formatters';
import { cn } from '../../lib/utils';

type LogType = 'all' | 'price' | 'status';

interface AuditEntry {
  type: 'price' | 'status';
  orderId: string;
  changedBy: string;
  timestamp: string;
  detail: PriceChangeLog | StatusChangeLog;
}

export function AuditPanel() {
  const { priceChangeLogs, statusChangeLogs, orders } = useStore();
  const [filter, setFilter] = useState<LogType>('all');
  const [search, setSearch] = useState('');

  const entries = useMemo<AuditEntry[]>(() => {
    const all: AuditEntry[] = [
      ...priceChangeLogs.map((l) => ({ type: 'price' as const, orderId: l.orderId, changedBy: l.changedBy, timestamp: l.timestamp, detail: l })),
      ...statusChangeLogs.map((l) => ({ type: 'status' as const, orderId: l.orderId, changedBy: l.changedBy, timestamp: l.timestamp, detail: l })),
    ];
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [priceChangeLogs, statusChangeLogs]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const order = orders.find((o) => o.id === e.orderId);
        return (
          e.orderId.includes(q) ||
          order?.campaignName.toLowerCase().includes(q) ||
          e.changedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, filter, search, orders]);

  const formatTs = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-zinc-500" />
          <h2 className="font-bold text-zinc-900">Historial de cambios</h2>
        </div>
        <div className="flex gap-1.5 ml-4">
          {(['all', 'price', 'status'] as LogType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'price' ? 'Precios' : 'Estados'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter size={13} className="text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orden o usuario..."
            className="text-xs px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/20 w-48 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <History size={40} className="text-zinc-300" />
            <p className="text-sm font-medium">Sin registros{filter !== 'all' ? ` de ${filter === 'price' ? 'precios' : 'estados'}` : ''}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((entry, idx) => {
              const order = orders.find((o) => o.id === entry.orderId);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-white transition-colors"
                >
                  {/* Icon */}
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    entry.type === 'price' ? 'bg-amber-100' : 'bg-blue-100'
                  )}>
                    {entry.type === 'price'
                      ? <DollarSign size={14} className="text-amber-600" />
                      : <ArrowRight size={14} className="text-blue-600" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900 text-sm truncate">
                        {order?.campaignName ?? entry.orderId}
                      </span>
                      <span className="text-zinc-400 font-mono text-xs shrink-0">{entry.orderId}</span>
                    </div>

                    {entry.type === 'price' ? (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Precio ítem #{(entry.detail as PriceChangeLog).itemIndex + 1}:{' '}
                        <span className="font-mono text-zinc-700 line-through">{formatCLP((entry.detail as PriceChangeLog).oldPrice)}</span>
                        {' → '}
                        <span className="font-mono font-semibold text-amber-700">{formatCLP((entry.detail as PriceChangeLog).newPrice)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Estado:{' '}
                        <span className="font-medium text-zinc-700">{(entry.detail as StatusChangeLog).fromStatus || '—'}</span>
                        {' → '}
                        <span className="font-medium text-blue-700">{(entry.detail as StatusChangeLog).toStatus}</span>
                      </p>
                    )}

                    <p className="text-[10px] text-zinc-400 mt-1">
                      {formatTs(entry.timestamp)} · por <span className="font-medium">{entry.changedBy}</span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
