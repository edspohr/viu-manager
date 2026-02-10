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
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
   AlertCircle, 
   CheckCircle2, 
   Box,
   Truck,
   Receipt,
   Inbox,
   FileText
} from 'lucide-react';
import type { Order } from '../data/mockData';
import { Modal } from '../components/common/Modal';

// --- Simplified Constants ---

const COLUMNS = [
  { id: 'Leads', label: 'Leads', icon: Inbox },
  { id: 'En Cotización', label: 'Cotizando', icon: FileText },
  { id: 'Por Aprobar', label: 'Aprobación', icon: CheckCircle2 },
  { id: 'En Producción', label: 'Producción', icon: Box },
  { id: 'Despacho', label: 'Despacho', icon: Truck },
  { id: 'Cobranza', label: 'Cobranza', icon: Receipt },
];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
     styles: { active: { opacity: '0.5' } },
  }),
};

// --- Minimalist Components ---

function OrderCard({ order, isOverlay = false, onClick }: { order: Order, isOverlay?: boolean, onClick?: () => void }) {
  const { customers } = useStore();
  const customerName = customers.find(c => c.id === order.customerId)?.name || 'Desconocido';
  
  // Only show SLA if critical
  // Check if order is late based on today's date (at render time)
  // To avoid impurity, we could use a stable `now` from context or just allow it if we accept re-renders on mount.
  // For simplicity, we just check against a new Date object created inside the component, 
  // but to satisfy purity rules, we'll suppress or move it.
  // Actually, comparing YYYY-MM-DD strings is safer and sufficient.
  const today = new Date().toISOString().split('T')[0];
  const isLate = order.deliveryDate ? (order.deliveryDate < today) : false;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all cursor-pointer group hover:shadow-md hover:border-slate-300",
        isOverlay ? "shadow-2xl scale-105 rotate-2" : "",
        isLate ? "border-l-4 border-l-red-500" : ""
      )}
    >
      <div className="flex justify-between items-start mb-1">
         <h4 className="font-bold text-slate-800 text-sm leading-tight">{customerName}</h4>
         {isLate && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>
      
      <p className="text-sm text-slate-500 truncate">{order.campaignName}</p>
      
      {/* Minimal Footer: Only essential badges */}
      <div className="flex items-center gap-2 mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
         {order.items.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
               {order.items.length} items
            </span>
         )}
         <span className="text-[10px] font-mono text-slate-400 ml-auto">
            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(order.totalAmount)}
         </span>
      </div>
    </div>
  );
}

function SortableItem({ order, onClick }: { order: Order, onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, data: { order } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-30 p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 h-[80px]"
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
  const { orders, setOrders, customers } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const columnsData = useMemo(() => {
    const data: Record<string, Order[]> = {};
    COLUMNS.forEach(col => data[col.id] = []);
    orders.forEach(order => {
      if (data[order.status]) {
        data[order.status].push(order);
      } else {
        if (!data['Leads']) data['Leads'] = [];
        data['Leads'].push(order);
      }
    });
    return data;
  }, [orders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    const activeOrder = orders.find(o => o.id === activeId);
    if (!activeOrder) return;
    const activeStatus = activeOrder.status;
    const overStatus = (orders.find(o => o.id === overId)?.status) || overId as string;
    
    if (activeStatus !== overStatus && COLUMNS.some(c => c.id === overStatus)) {
       const newOrders = [...orders];
       const activeIndex = orders.findIndex(o => o.id === activeId);
       newOrders[activeIndex] = { ...newOrders[activeIndex], status: overStatus as Order['status'] };
       setOrders(newOrders);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIndex = orders.findIndex(o => o.id === active.id);
    const overIndex = orders.findIndex(o => o.id === over.id);
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      if (orders[activeIndex].status === orders[overIndex].status) {
         setOrders(arrayMove(orders, activeIndex, overIndex));
      }
    }
  };

  const activeOrder = orders.find(o => o.id === activeId);

  return (
    <div className="h-[calc(100vh-140px)] overflow-x-auto pb-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 min-w-max h-full px-2">
          {COLUMNS.map((col) => (
            <div key={col.id} className="w-[260px] flex flex-col h-full">
              {/* Clean Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                 <div className="flex items-center gap-2 text-slate-500">
                    <col.icon className="h-5 w-5" />
                    <h3 className="font-bold text-sm">{col.label}</h3>
                 </div>
                 <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                   {columnsData[col.id].length}
                 </span>
              </div>

              {/* Droppable */}
              <div className="flex-1 overflow-y-auto pr-2 pb-20">
                <SortableContext 
                  items={columnsData[col.id].map(o => o.id)} 
                  strategy={verticalListSortingStrategy}
                  id={col.id}
                >
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    {columnsData[col.id].map((order) => (
                      <SortableItem key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                    ))}
                    {columnsData[col.id].length === 0 && (
                       <div className="h-32 border-2 border-dashed border-slate-100 rounded-xl" />
                    )}
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

      {/* Reuse generic Key Modal for Details */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.campaignName || 'Detalle'}
        footer={<button onClick={() => setSelectedOrder(null)} className="ml-auto text-sm text-slate-500 hover:text-slate-900">Cerrar</button>}
      >
         <div className="space-y-4">
            <p className="text-slate-600">
               Cliente: <span className="font-bold text-slate-900">{customers.find(c => c.id === selectedOrder?.customerId)?.name}</span>
            </p>
            <p className="text-slate-600">
               Monto: <span className="font-bold text-slate-900">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedOrder?.totalAmount || 0)}
               </span>
            </p>
            <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm italic text-slate-500">
               Vista simplificada. Para gestión completa, usar vista de Operaciones.
            </div>
         </div>
      </Modal>
    </div>
  );
}
