
import { useState, useMemo } from 'react';
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
  type DropAnimation
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { 
   Inbox,
   Sparkles,
   Settings,
   Calendar,
   CheckCircle2,
   Box,
   Truck,
   Receipt
} from 'lucide-react';
import type { Order } from '../../data/mockData';
import { AICotizadorModal } from '../modals/AICotizadorModal';

// --- Configuration ---

const COLUMNS = [
  { id: 'Solicitud', label: 'Solicitud', icon: Inbox, color: 'text-zinc-500' },
  { id: 'Por Aprobar', label: 'Por Aprobar', icon: CheckCircle2, color: 'text-amber-500' },
  { id: 'En Producción', label: 'Producción', icon: Box, color: 'text-blue-500' },
  { id: 'Despacho', label: 'Despacho', icon: Truck, color: 'text-purple-500' },
  { id: 'Terminado', label: 'Terminado', icon: Receipt, color: 'text-emerald-500' },
];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
};

// --- Components ---

function OrderCard({ order, isOverlay = false, onClick }: { order: Order, isOverlay?: boolean, onClick?: () => void }) {
  const { customers } = useStore();
  const customerName = customers.find(c => c.id === order.customerId)?.name || 'Cliente';
  
  const statusColors = {
    'Rojo': 'bg-rose-500',
    'Amarillo': 'bg-amber-400',
    'Verde': 'bg-emerald-500',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer relative",
        isOverlay ? "shadow-2xl scale-105 rotate-1 bg-white ring-1 ring-zinc-900/5" : ""
      )}
    >
      {/* File Status Indicator */}
      <div className={cn("absolute top-4 right-4 w-2 h-2 rounded-full", statusColors[order.fileStatus])} />

      <div className="mb-3">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight pr-4">{order.campaignName}</h4>
        <p className="text-xs text-zinc-500 mt-1 font-medium">{customerName}</p>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
           <span className="font-mono text-zinc-500">{order.id}</span>
        </div>
        {order.deliveryDate && (
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-400">
             <Calendar size={12} />
             <span>{new Date(order.deliveryDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableItem({ order, onClick, disabled }: { order: Order, onClick: () => void, disabled?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: order.id, 
    data: { order },
    disabled: disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-40 p-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 h-[100px]"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard order={order} onClick={onClick} />
    </div>
  );
}

// --- Main Board ---

export function KanbanBoard() {
  const { orders, updateOrderStatus, currentUser, customers } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    if (currentUser.role === 'client') {
      return orders.filter(o => o.customerId === currentUser.id);
    }
    return orders;
  }, [orders, currentUser]);

  const columnsData = useMemo(() => {
    const data: Record<string, Order[]> = {};
    COLUMNS.forEach(col => data[col.id] = []);
    filteredOrders.forEach(order => {
      // Handle legacy status mapping if needed, or mostly assume mock data is correct
      if (data[order.status]) {
        data[order.status].push(order);
      } else {
        // Fallback for unmatched status
        if (!data['Solicitud']) data['Solicitud'] = [];
        data['Solicitud'].push(order);
      }
    });
    return data;
  }, [filteredOrders]);

  // --- Drag Logic ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const isDragEnabled = currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.role === 'operations';

  const handleDragStart = (event: DragStartEvent) => {
    if (!isDragEnabled) return;
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isDragEnabled) return;
    const { active, over } = event;
    if (!over) return;
    
    // Logic for Operations: restricted columns
    if (currentUser.role === 'operations') {
      const allowedColumns = ['Por Aprobar', 'En Producción', 'Despacho', 'Terminado'];
      const overStatus = (orders.find(o => o.id === over.id)?.status) || over.id as string;
      const activeStatus = orders.find(o => o.id === active.id)?.status;
      
      // Prevent dragging INTO restricted columns (e.g. Solicitud) or FROM restricted columns
      // For simplicity in this demo, strict block:
      if (!allowedColumns.includes(overStatus) || (activeStatus && !allowedColumns.includes(activeStatus))) {
         return; // Cancel or visual feedback? filtering 'over' prevents drop but not drag visual. 
         // Real cancellation happens in DragEnd, but visual cues in DragOver
      }
    }

    // Standard DragOver reordering logic
    // ... implemented in DragEnd for simplicity with setOrders, 
    // but specific column changing logic during drag can be complex.
    // simpler method: just handle column change in DragEnd for robust state updates
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isDragEnabled) return;
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeOrder = orders.find(o => o.id === active.id);
    if (!activeOrder) return;
    
    const overId = over.id;
    // Determine target column
    let targetStatus = overId as Order['status'];
    // If over an item, get that item's status
    const overOrder = orders.find(o => o.id === overId);
    if (overOrder) {
      targetStatus = overOrder.status;
    }

    // Role Guards
    if (currentUser.role === 'client') return;
    if (currentUser.role === 'operations') {
       const allowedOps = ['Por Aprobar', 'En Producción', 'Despacho', 'Terminado'];
       if (!allowedOps.includes(targetStatus) || !allowedOps.includes(activeOrder.status)) return;
    }

    // Update Status if changed
    if (activeOrder.status !== targetStatus) {
      updateOrderStatus(activeOrder.id, targetStatus);
    } 
    // If same column, reorder (requires array move in store, for now we just sort by date/id in view mostly)
    // For this prototype, we'll skip precise intra-column reordering in store to keep useStore simple
  };

  const activeOrder = orders.find(o => o.id === activeId);

  // --- Modal Logic ---
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-100 font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold">
            V
          </div>
          <span className="font-bold tracking-tight text-lg">Manager</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {currentUser.role} View
          </span>
        </div>

        <div className="flex items-center gap-4">
          {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
            <button 
              onClick={() => setIsAIModalOpen(true)}
              className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Nueva Cotización IA</span>
            </button>
          )}
          
          {currentUser.role === 'superadmin' && (
            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          )}

          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-semibold">
             {currentUser.role[0].toUpperCase()}
          </div>
        </div>
      </header>
      
      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-6 min-w-max">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-[320px] flex flex-col h-full rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-md bg-white dark:bg-zinc-800 shadow-sm", col.color)}>
                      <col.icon size={16} />
                    </div>
                    <span className="font-semibold text-sm tracking-wide text-zinc-700 dark:text-zinc-300 uppercase">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                    {columnsData[col.id].length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto px-3 pb-4">
                  <SortableContext 
                    items={columnsData[col.id].map(o => o.id)} 
                    strategy={verticalListSortingStrategy}
                    id={col.id}
                  >
                     <div className="space-y-3 min-h-[100px]">
                      {columnsData[col.id].map((order) => (
                        <SortableItem 
                          key={order.id} 
                          order={order} 
                          onClick={() => setSelectedOrderId(order.id)}
                          disabled={!isDragEnabled}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeOrder ? <OrderCard order={activeOrder} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <AICotizadorModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
      
      {/* Simple Details Modal for this Refactor */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4" onClick={() => setSelectedOrderId(null)}>
           <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedOrder.campaignName}</h2>
                    <p className="text-zinc-500 text-sm mt-1">ID: {selectedOrder.id}</p>
                 </div>
                 <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <Settings size={20} className="text-zinc-400" />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Descripción</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                       {selectedOrder.description || "Sin descripción detallada."}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Cliente</h4>
                        <p className="font-medium text-zinc-900 dark:text-white">
                           {customers.find(c => c.id === selectedOrder.customerId)?.name}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Total</h4>
                        <p className="font-mono font-medium text-zinc-900 dark:text-white">
                           {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedOrder.totalAmount)}
                        </p>
                    </div>
                 </div>

                 {/* Operations Checklist Simulation */}
                 {currentUser.role === 'operations' && (
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                       <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Checklist de Operaciones</h4>
                       <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
                             <input type="checkbox" className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900" />
                             <span className="text-sm text-zinc-700 dark:text-zinc-300">Material Reservado</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
                             <input type="checkbox" className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900" />
                             <span className="text-sm text-zinc-700 dark:text-zinc-300">Archivos Revisados</span>
                          </label>
                       </div>
                    </div>
                 )}
              </div>
              
              <div className="mt-8 flex justify-end">
                 <button onClick={() => setSelectedOrderId(null)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                    Cerrar
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
