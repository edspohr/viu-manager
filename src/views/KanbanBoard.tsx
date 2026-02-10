import { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, // Critical for mobile
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
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Clock, CheckCircle2, AlertOctagon, Eye, Paperclip } from 'lucide-react';
import type { Order } from '../data/mockData';
import { Modal } from '../components/common/Modal';
import { toast } from 'sonner';

// --- Types & Constants ---

const COLUMNS = [
  { id: 'Leads', label: 'Leads / Solicitudes', color: 'bg-slate-100 border-slate-200' },
  { id: 'En Cotización', label: 'En Cotización', color: 'bg-blue-50 border-blue-200' },
  { id: 'Por Aprobar', label: 'Por Aprobar', color: 'bg-amber-50 border-amber-200' },
  { id: 'En Producción', label: 'En Producción', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'Despacho', label: 'Despacho', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'Cobranza', label: 'Cobranza', color: 'bg-rose-50 border-rose-200' },
];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

// --- Helper Components ---

function OrderCard({ order, isOverlay = false, onClick }: { order: Order, isOverlay?: boolean, onClick?: () => void }) {
  const { customers } = useStore();
  const customerName = customers.find(c => c.id === order.customerId)?.name || 'Desconocido';
  
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

  const getSLAStyle = (dateStr: string, status: string) => {
    if (status === 'Despacho' || status === 'Cobranza') return '';
    if (!dateStr) return '';
    const diffHours = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) return 'border-red-500 ring-2 ring-red-100';
    if (diffHours < 48) return 'border-amber-500 ring-1 ring-amber-50';
    return 'border-slate-200';
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-3 rounded-xl border shadow-sm transition-all relative group touch-manipulation",
        getSLAStyle(order.deliveryDate, order.status),
        isOverlay ? "shadow-2xl scale-105 rotate-3 cursor-grabbing" : "hover:shadow-md cursor-pointer hover:border-slate-300"
      )}
    >
      <div className="flex justify-between items-start mb-2">
         <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
           {customerName}
         </span>
         {order.status === 'Cobranza' && (
           <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertOctagon className="h-3 w-3" /> &gt;30d
           </span>
         )}
      </div>
      
      <h4 className="font-medium text-slate-800 text-sm leading-tight mb-2">{order.campaignName}</h4>
      
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100/50">
        {order.items.length > 0 
          ? order.items.map(i => `${i.quantity}x ${i.materialId}`).join(', ')
          : 'Sin items definidos'}
      </p>
      
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
         <span className="text-xs font-bold text-slate-700">{formatPrice(order.totalAmount)}</span>
         <div className="flex items-center gap-1.5">
            {order.fileStatus === 'Verde' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            {order.fileStatus === 'Amarillo' && <Clock className="h-3.5 w-3.5 text-amber-500" />}
            {order.fileStatus === 'Rojo' && <AlertOctagon className="h-3.5 w-3.5 text-red-500" />}
         </div>
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
        className="opacity-30 p-3 rounded-xl border border-slate-200 border-dashed bg-slate-50/50 h-[100px]"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard order={order} onClick={onClick} />
    </div>
  );
}

// --- Main Component ---

export function KanbanBoard() {
  const { orders, setOrders, customers } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Group orders by status (memoized)
  const columnsData = useMemo(() => {
    const data: Record<string, Order[]> = {};
    COLUMNS.forEach(col => data[col.id] = []);
    orders.forEach(order => {
      if (data[order.status]) {
        data[order.status].push(order);
      } else {
        // Fallback for unknown statuses
        if (!data['Leads']) data['Leads'] = [];
        data['Leads'].push(order);
      }
    });
    return data;
  }, [orders]);

  // Sensors for Drag & Drop (Mouse, Touch, Keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Requires 5px movement to start drag
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }), // Long press for touch
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the containers
    const activeOrder = orders.find(o => o.id === activeId);
    const overOrder = orders.find(o => o.id === overId);
    
    if (!activeOrder) return;

    const activeStatus = activeOrder.status;
    const overStatus = overOrder ? overOrder.status : overId as string; // If over generic container
    
    // If different containers
    if (activeStatus !== overStatus) {
       // We update the state optimistically for smooth drag over columns
       // Note: In a real app we might wait for Drop, but dnd-kit recommends updating items for Sortable
       
       const activeIndex = orders.findIndex(o => o.id === activeId);
       // Logic to just update the status field of the dragged item to the new column
       const newOrders = [...orders];
       
       // Check if over is a valid status column
       const isValidColumn = COLUMNS.some(c => c.id === overStatus);
       if (isValidColumn) {
         newOrders[activeIndex] = { ...newOrders[activeIndex], status: overStatus as Order['status'] };
         setOrders(newOrders);
       }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = orders.findIndex(o => o.id === activeId);
    const overIndex = orders.findIndex(o => o.id === overId);

    // If moved within same list (reordering)
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      const activeOrder = orders[activeIndex];
      const overOrder = orders[overIndex];
      
      // Only reorder if in same column
      if (activeOrder.status === overOrder.status) {
         setOrders(arrayMove(orders, activeIndex, overIndex));
      }
    }

    // Trigger toast via Sonner (simulating success)
    const order = orders.find(o => o.id === activeId);
    if (order) {
      toast.success(`Orden ${order.campaignName} actualizada`, {
         description: `Nuevo estado: ${order.status}`
      });
    }
  };

  const activeOrder = orders.find(o => o.id === activeId);

  return (
    <div className="h-[calc(100vh-250px)] overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 min-w-max h-full px-1">
          {COLUMNS.map((col) => (
            <div key={col.id} className="w-[300px] flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 shadow-sm">
              {/* Column Header */}
              <div className={cn("p-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10 flex justify-between items-center group", col.color)}>
                 <div>
                   <h3 className="font-semibold text-slate-800 text-sm">{col.label}</h3>
                   <span className="text-xs text-slate-500 font-mono">
                     {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(
                       columnsData[col.id].reduce((sum, o) => sum + o.totalAmount, 0)
                     )}
                   </span>
                 </div>
                 <span className="bg-white/80 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                   {columnsData[col.id].length}
                 </span>
              </div>

              {/* Droppable Area */}
              <div className="flex-1 p-2 overflow-y-auto">
                <SortableContext 
                  items={columnsData[col.id].map(o => o.id)} 
                  strategy={verticalListSortingStrategy}
                  id={col.id} // Important: Drop on empty column needs this ID to be recognized
                >
                  <div className="flex flex-col gap-3 min-h-[100px]">
                    {columnsData[col.id].map((order) => (
                      <SortableItem key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                    ))}
                    {columnsData[col.id].length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center text-slate-300 text-xs italic p-4 border-2 border-dashed border-slate-200 rounded-lg">
                          Arrastra aquí
                       </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            </div>
          ))}
        </div>

        {/* Drag Overlay (The card that follows cursor) */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeOrder ? <OrderCard order={activeOrder} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* --- Order Detail Modal --- */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={
          <div className="flex items-center gap-3">
             <span className="text-sm font-mono text-slate-400">#{selectedOrder?.id.toUpperCase()}</span>
             <span className="h-4 w-px bg-slate-200" />
             <span>{customers.find(c => c.id === selectedOrder?.customerId)?.name}</span>
          </div>
        }
        footer={
           <div className="flex w-full justify-between">
              <button 
                 onClick={() => toast.error('Problema reportado a operaciones')}
                 className="text-red-500 hover:text-red-600 text-sm font-medium px-3 py-2"
              >
                Reportar Problema
              </button>
              <button 
                onClick={() => {
                   toast.success('Orden avanzada a siguiente etapa');
                   setSelectedOrder(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                Avanzar Etapa
              </button>
           </div>
        }
      >
         {selectedOrder && (
           <div className="space-y-6">
             {/* Status Badge */}
             <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
               <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Estado Actual</p>
                  <p className="font-semibold text-slate-800">{selectedOrder.status}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Monto Total</p>
                  <p className="font-semibold text-slate-800 text-lg">
                     {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(selectedOrder.totalAmount)}
                  </p>
               </div>
             </div>

             {/* Tabs Mockup */}
             <div>
                <div className="flex border-b border-slate-200 mb-4">
                   <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 active">Detalle</button>
                   <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Archivos</button>
                   <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Historial</button>
                </div>
                
                <div className="space-y-4">
                   <h4 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-2">Items del Pedido</h4>
                   {selectedOrder.items.length > 0 ? (
                      <div className="space-y-3">
                         {selectedOrder.items.map((item, idx) => (
                           <div key={idx} className="flex items-start gap-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                              <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 font-bold">
                                 {idx + 1}
                              </div>
                              <div className="flex-1">
                                 <p className="text-sm font-medium text-slate-800">{item.materialId} ({item.quantity} un.)</p>
                                 <p className="text-xs text-slate-500 mt-0.5">{item.width}cm x {item.height}cm</p>
                                 <div className="flex flex-wrap gap-1 mt-2">
                                    {item.finishing.map(f => (
                                       <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                          {f}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   ) : (
                      <p className="text-sm text-slate-500 italic">Sin items especificados.</p>
                   )}
                   
                   <h4 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-2 mt-6">Archivos Adjuntos</h4>
                   <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="p-2 bg-white rounded-md border border-slate-200">
                         <Paperclip className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium text-slate-700 truncate">arte_final_campaña_v2.pdf</p>
                         <p className="text-xs text-slate-500">12.4 MB • Subido hace 2h</p>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                         <Eye className="h-4 w-4" />
                      </button>
                   </div>
                   
                   <h4 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-2 mt-6"> Última Actividad</h4>
                   <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">PA</div>
                      <div className="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-200 text-sm text-slate-600 w-full">
                         <p className="font-semibold text-xs text-slate-800 mb-1">Paulina (Cliente) <span className="font-normal text-slate-400">• 10:42 AM</span></p>
                         <p>Archivo recibido y aprobado. Por favor proceder con la muestra de color antes de imprimir todo el lote.</p>
                      </div>
                   </div>

                </div>
             </div>
           </div>
         )}
      </Modal>
    </div>
  );
}
