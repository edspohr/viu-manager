import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { formatCLP } from '../../lib/formatters';
import { Inbox, CheckCircle2, Box, Truck, Receipt, Search, Plus } from 'lucide-react';
import type { Order, Customer, Material } from '../../data/mockData';
import { OrderCard } from './OrderCard';
import { SkeletonCard } from '../ui/Skeleton';
import { AICotizadorModal } from '../modals/AICotizadorModal';
import { PricingConfigModal } from '../modals/PricingConfigModal';
import { OrderDetailModal } from '../modals/OrderDetailModal';
import { ProductionCalendar } from '../calendar/ProductionCalendar';

// ─── Configuration ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'Solicitud',     label: 'Solicitud',   icon: Inbox,        color: 'text-zinc-500',    accent: 'zinc'    },
  { id: 'Por Aprobar',   label: 'Por Aprobar', icon: CheckCircle2, color: 'text-amber-500',   accent: 'amber'   },
  { id: 'En Producción', label: 'Producción',  icon: Box,          color: 'text-blue-500',    accent: 'blue'    },
  { id: 'Despacho',      label: 'Despacho',    icon: Truck,        color: 'text-purple-500',  accent: 'purple'  },
  { id: 'Terminado',     label: 'Terminado',   icon: Receipt,      color: 'text-emerald-500', accent: 'emerald' },
] as const;

const COLUMN_OVER_BORDER: Record<string, string> = {
  'Solicitud':     'border-zinc-400/70',
  'Por Aprobar':   'border-amber-400/70',
  'En Producción': 'border-blue-400/70',
  'Despacho':      'border-purple-400/70',
  'Terminado':     'border-emerald-400/70',
};

const COLUMN_GHOST_STYLE: Record<string, string> = {
  'Solicitud':     'border-zinc-300   bg-zinc-100/60',
  'Por Aprobar':   'border-amber-300  bg-amber-50/60',
  'En Producción': 'border-blue-300   bg-blue-50/60',
  'Despacho':      'border-purple-300 bg-purple-50/60',
  'Terminado':     'border-emerald-300 bg-emerald-50/60',
};

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
};

// ─── SortableItem ─────────────────────────────────────────────────────────────

function SortableItem({
  order,
  onClick,
  disabled,
  bouncing,
  customers,
  materials,
}: {
  order: Order;
  onClick: () => void;
  disabled?: boolean;
  bouncing: boolean;
  customers: Customer[];
  materials: Material[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: order.id, data: { order }, disabled });

  const style = { transform: CSS.Translate.toString(transform), transition };
  const ghostClass = COLUMN_GHOST_STYLE[order.status] ?? 'border-zinc-300 bg-zinc-50';

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-xl border-2 border-dashed h-[108px] opacity-60',
          ghostClass
        )}
      />
    );
  }

  const customer = customers.find((c) => c.id === order.customerId);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard
        order={order}
        customer={customer}
        materials={materials}
        bouncing={bouncing}
        onClick={onClick}
      />
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  view: 'board' | 'calendar' | 'csv';
  isAIModalOpen: boolean;
  onAIModalClose: () => void;
  isConfigModalOpen: boolean;
  onConfigModalClose: () => void;
  isRoleManagerOpen?: boolean;
  onRoleManagerClose?: () => void;
}

export function KanbanBoard({
  view,
  isAIModalOpen,
  onAIModalClose,
  isConfigModalOpen,
  onConfigModalClose,
}: KanbanBoardProps) {
  const {
    orders, customers, materials,
    updateOrderStatus, currentUser, exportOrdersCSV,
  } = useStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [csvFrom, setCsvFrom] = useState('');
  const [csvTo, setCsvTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const showCalendar = view === 'calendar';
  const showCsvPanel = view === 'csv';

  // Simulate initial load (from localStorage via Zustand hydration)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const roleFilteredOrders = useMemo(() => {
    if (currentUser.role === 'client') {
      return orders.filter((o) => o.customerId === currentUser.id);
    }
    return orders;
  }, [orders, currentUser]);

  const displayOrders = useMemo(() => {
    if (!searchQuery.trim()) return roleFilteredOrders;
    const q = searchQuery.toLowerCase();
    return roleFilteredOrders.filter((o) => {
      const cust = customers.find((c) => c.id === o.customerId);
      return (
        o.campaignName.toLowerCase().includes(q) ||
        (cust?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [roleFilteredOrders, searchQuery, customers]);

  const columnsData = useMemo(() => {
    const data: Record<string, { orders: Order[]; sum: number }> = {};
    COLUMNS.forEach((col) => { data[col.id] = { orders: [], sum: 0 }; });
    displayOrders.forEach((order) => {
      const col = data[order.status] ?? data['Solicitud'];
      col.orders.push(order);
      col.sum += order.totalAmount;
    });
    return data;
  }, [displayOrders]);

  const activePortfolio = useMemo(
    () =>
      roleFilteredOrders
        .filter((o) => o.status !== 'Terminado')
        .reduce((s, o) => s + o.totalAmount, 0),
    [roleFilteredOrders]
  );

  // ── Drag ───────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const isDragEnabled =
    currentUser.role === 'admin' ||
    currentUser.role === 'superadmin' ||
    currentUser.role === 'operations';

  const handleDragStart = (event: DragStartEvent) => {
    if (!isDragEnabled) return;
    setActiveId(event.active.id as string);
    setJustDroppedId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverColumnId(null); return; }

    const directColId = COLUMNS.find((c) => c.id === over.id)?.id ?? null;
    const overOrderStatus = orders.find((o) => o.id === over.id)?.status ?? null;
    setOverColumnId(directColId ?? overOrderStatus);

    if (!isDragEnabled) return;

    if (currentUser.role === 'operations') {
      const allowedColumns = ['Por Aprobar', 'En Producción', 'Despacho', 'Terminado'];
      const overStatus = overOrderStatus ?? (over.id as string);
      const activeStatus = orders.find((o) => o.id === active.id)?.status;
      if (
        !allowedColumns.includes(overStatus) ||
        (activeStatus && !allowedColumns.includes(activeStatus))
      ) {
        return;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setOverColumnId(null);
    if (!isDragEnabled) { setActiveId(null); return; }

    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeOrder = orders.find((o) => o.id === active.id);
    if (!activeOrder) return;

    let targetStatus = over.id as Order['status'];
    const overOrder = orders.find((o) => o.id === over.id);
    if (overOrder) targetStatus = overOrder.status;

    if (currentUser.role === 'client') return;
    if (currentUser.role === 'operations') {
      const allowed = ['Por Aprobar', 'En Producción', 'Despacho', 'Terminado'];
      if (!allowed.includes(targetStatus) || !allowed.includes(activeOrder.status)) return;
    }

    if (activeOrder.status !== targetStatus) {
      updateOrderStatus(activeOrder.id, targetStatus);
      toast.success(`Orden movida a "${targetStatus}"`);
      setJustDroppedId(activeOrder.id);
      setTimeout(() => setJustDroppedId(null), 500);
    }
  };

  const activeOrder = orders.find((o) => o.id === activeId);

  // unused but kept for empty-state button reference
  const handleOpenAIModal = useCallback(() => {}, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 bg-zinc-50 flex flex-col text-zinc-900 font-sans">

      {/* Top bar — search + portfolio */}
      <div className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar campaña o cliente..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
          />
        </div>
        {searchQuery.trim() && (
          <span className="text-xs text-zinc-500">
            {displayOrders.length} resultado{displayOrders.length !== 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto text-xs text-zinc-400">
          {activePortfolio > 0 && (
            <span>Cartera activa: <span className="font-mono font-semibold text-zinc-600">{formatCLP(activePortfolio)}</span></span>
          )}
        </div>
      </div>

      {/* CSV Panel */}
      {showCsvPanel && (
        <div className="border-b border-zinc-200 bg-white px-6 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Exportar órdenes</span>
          <input
            type="date"
            value={csvFrom}
            onChange={(e) => setCsvFrom(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-700"
          />
          <span className="text-zinc-400 text-xs">→</span>
          <input
            type="date"
            value={csvTo}
            onChange={(e) => setCsvTo(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-700"
          />
          <button
            onClick={() => {
              if (!csvFrom || !csvTo) { toast.error('Selecciona un rango de fechas'); return; }
              exportOrdersCSV(csvFrom, csvTo);
              toast.success('CSV generado');
            }}
            disabled={!csvFrom || !csvTo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Descargar
          </button>
        </div>
      )}

      {/* Calendar view */}
      {showCalendar && (
        <div className="flex-1 overflow-hidden">
          <ProductionCalendar onOrderClick={(id) => setSelectedOrderId(id)} />
        </div>
      )}

      {/* Board */}
      <div className={cn('flex-1 overflow-x-auto overflow-y-hidden p-6', showCalendar && 'hidden')}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-5 min-w-max">
            {COLUMNS.map((col) => {
              const colData = columnsData[col.id];
              const isOver = overColumnId === col.id && activeId !== null;
              const colOrders = colData.orders;

              return (
                <div
                  key={col.id}
                  id={col.id}
                  className={cn(
                    'w-[300px] flex flex-col h-full rounded-2xl bg-zinc-100/60 border-2 transition-all duration-150',
                    isOver
                      ? COLUMN_OVER_BORDER[col.id]
                      : 'border-transparent'
                  )}
                >
                  {/* Column header */}
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-1.5 rounded-lg bg-white shadow-sm', col.color)}>
                        <col.icon size={14} />
                      </div>
                      <span className="font-semibold text-xs tracking-widest text-zinc-600 uppercase">
                        {col.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-zinc-500 bg-white border border-zinc-200 px-2 py-1 rounded-lg leading-none">
                        {colOrders.length} órd.
                        {colData.sum > 0 && (
                          <span className="ml-1 text-zinc-400 font-normal">· {formatCLP(colData.sum)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 overflow-y-auto px-3 pb-4">
                    <SortableContext
                      items={colOrders.map((o) => o.id)}
                      strategy={verticalListSortingStrategy}
                      id={col.id}
                    >
                      {isLoading ? (
                        /* ── Skeleton loading state ── */
                        <div className="space-y-2.5 min-h-[100px]">
                          {[1, 2, 3].map((k) => (
                            <SkeletonCard key={k} />
                          ))}
                        </div>
                      ) : colOrders.length === 0 ? (
                        /* ── Empty state ── */
                        <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
                          <col.icon size={32} className="text-zinc-300" />
                          <p className="text-xs font-medium text-zinc-400">Sin órdenes</p>
                          {col.id === 'Solicitud' && (currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                            <button
                              onClick={handleOpenAIModal}
                              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors mt-1 font-medium"
                            >
                              <Plus size={12} />
                              Nueva solicitud
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5 min-h-[100px]">
                          {colOrders.map((order) => (
                            <SortableItem
                              key={order.id}
                              order={order}
                              onClick={() => setSelectedOrderId(order.id)}
                              disabled={!isDragEnabled}
                              bouncing={order.id === justDroppedId}
                              customers={customers}
                              materials={materials}
                            />
                          ))}
                        </div>
                      )}
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={dropAnimation}>
            {activeOrder ? (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.04, rotate: 1.5 }}
                transition={{ duration: 0.12 }}
                className="shadow-2xl"
              >
                <OrderCard
                  order={activeOrder}
                  customer={customers.find((c) => c.id === activeOrder.customerId)}
                  materials={materials}
                />
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <AICotizadorModal isOpen={isAIModalOpen} onClose={onAIModalClose} />
      <PricingConfigModal isOpen={isConfigModalOpen} onClose={onConfigModalClose} />
      <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}
