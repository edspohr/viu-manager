import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Cpu, Clock, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import type { Order } from '../../data/mockData';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FILE_STATUS_DOT: Record<Order['fileStatus'], string> = {
  Rojo: 'bg-rose-500',
  Amarillo: 'bg-amber-400',
  Verde: 'bg-emerald-500',
};

const STATUS_COLORS: Record<Order['status'], string> = {
  Solicitud: 'border-zinc-300 bg-zinc-50',
  'Por Aprobar': 'border-amber-300 bg-amber-50',
  'En Producción': 'border-blue-300 bg-blue-50',
  Despacho: 'border-purple-300 bg-purple-50',
  Terminado: 'border-emerald-300 bg-emerald-50',
};

/** Returns the Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns an array of 7 Date objects for the week starting on `monday`. */
function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface ProductionCalendarProps {
  onOrderClick: (orderId: string) => void;
}

export function ProductionCalendar({ onOrderClick }: ProductionCalendarProps) {
  const { orders, customers } = useStore();
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(getWeekStart(new Date()));

  // Build a map: ISO date string → orders with that deliveryDate
  const ordersByDay = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (!order.deliveryDate) continue;
      // deliveryDate is stored as YYYY-MM-DD — parse as local date
      const [y, m, d] = order.deliveryDate.split('-').map(Number);
      const key = new Date(y, m - 1, d).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }
    return map;
  }, [orders]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const fmt = (d: Date) => d.toLocaleDateString('es-CL', opts);
    return `${fmt(weekStart)} — ${fmt(end)}, ${end.getFullYear()}`;
  }, [weekStart]);

  // Total man-hours for the visible week
  const weekManHours = useMemo(() => {
    let total = 0;
    for (const day of days) {
      for (const order of ordersByDay.get(day.toDateString()) ?? []) {
        total += order.manHours ?? 0;
      }
    }
    return total;
  }, [days, ordersByDay]);

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-zinc-600" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
          <h2 className="text-sm font-semibold text-zinc-800">{weekLabel}</h2>
          <button
            onClick={goToday}
            className="px-3 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-600"
          >
            Hoy
          </button>
        </div>
        {weekManHours > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={13} />
            <span>
              <span className="font-mono font-semibold text-zinc-700">{weekManHours.toFixed(1)} HH</span>
              {' '}esta semana
            </span>
          </div>
        )}
      </div>

      {/* Day columns */}
      <div className="flex-1 grid grid-cols-7 divide-x divide-zinc-200 overflow-y-auto">
        {days.map((day, colIdx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = colIdx >= 5;
          const dayOrders = ordersByDay.get(day.toDateString()) ?? [];

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex flex-col min-h-[420px]',
                isWeekend ? 'bg-zinc-100/60' : 'bg-white'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'px-2 py-2 border-b border-zinc-200 text-center',
                  isToday && 'bg-zinc-900'
                )}
              >
                <p className={cn('text-[11px] font-semibold uppercase tracking-wider', isToday ? 'text-zinc-300' : 'text-zinc-400')}>
                  {DAY_NAMES[colIdx]}
                </p>
                <p className={cn('text-base font-bold mt-0.5', isToday ? 'text-white' : isWeekend ? 'text-zinc-400' : 'text-zinc-800')}>
                  {day.getDate()}
                </p>
              </div>

              {/* Order cards */}
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {dayOrders.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-zinc-300 text-xs">—</span>
                  </div>
                )}
                {dayOrders.map((order) => {
                  const customer = customers.find((c) => c.id === order.customerId);
                  return (
                    <button
                      key={order.id}
                      onClick={() => onOrderClick(order.id)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg border transition-all hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
                        STATUS_COLORS[order.status]
                      )}
                    >
                      {/* Campaign + fileStatus dot */}
                      <div className="flex items-start gap-1.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', FILE_STATUS_DOT[order.fileStatus])} />
                        <p className="text-xs font-semibold text-zinc-800 leading-tight line-clamp-2">
                          {order.campaignName}
                        </p>
                      </div>

                      {/* Customer */}
                      {customer && (
                        <p className="text-[10px] text-zinc-500 mt-1 pl-3 truncate">{customer.name}</p>
                      )}

                      {/* Machine + hours badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5 pl-3">
                        {order.machineAssignment && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 border border-zinc-200 rounded text-[10px] text-zinc-600">
                            <Cpu size={9} /> {order.machineAssignment}
                          </span>
                        )}
                        {(order.manHours ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 border border-zinc-200 rounded text-[10px] text-zinc-600">
                            <Clock size={9} /> {order.manHours}h
                          </span>
                        )}
                        {order.overtimeEnabled && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded text-[10px] text-amber-700">
                            <Zap size={9} /> OT
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
