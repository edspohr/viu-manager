import { useState } from 'react'; // Added useState
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
   Printer,
   Scissors,
   AlertCircle,
   CheckCircle,
   Clock,
   FileIcon,
   ChevronDown,
   ChevronUp,
   MoreHorizontal
} from 'lucide-react';
import type { Order } from '../data/mockData';

export function OperationsView() {
  const { orders, updateFileStatus, updateOrderStatus, materials } = useStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Filter for orders relevant to operations
  const allProductionOrders = orders
    .filter(o => ['En Producción', 'Por Aprobar'].includes(o.status) || (o.status === 'Leads' && o.fileStatus !== 'Verde'))
    .sort((a, b) => {
       if (!a.deliveryDate) return 1;
       if (!b.deliveryDate) return -1;
       return a.deliveryDate.localeCompare(b.deliveryDate);
    });

  // Separate queues
  const readyQueue = allProductionOrders.filter(o => o.fileStatus === 'Verde' && o.status === 'En Producción');
  const pendingQueue = allProductionOrders.filter(o => o.fileStatus !== 'Verde' || o.status !== 'En Producción');

  const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || id;

  const handleStatusChange = (orderId: string, newStatus: Order['fileStatus']) => {
     updateFileStatus(orderId, newStatus);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cola de Producción</h1>
            <p className="text-slate-500 text-sm">Gestión de Taller y Archivos</p>
          </div>
          <div className="flex gap-2">
             <span className="flex items-center gap-1 text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                <Printer className="h-4 w-4" /> 55 planchas/día
             </span>
             <span className="flex items-center gap-1 text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                <Scissors className="h-4 w-4" /> Mesa 1: OK
             </span>
          </div>
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Queue - Ready for Production */}
          <div className="lg:col-span-2 space-y-4">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
               Producción Activa
               <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{readyQueue.length}</span>
             </h2>

             {readyQueue.length === 0 ? (
               <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
                  Todo está tranquilo por aquí. No hay pedidos listos en cola.
               </div>
             ) : (
               <div className="space-y-3">
                 {readyQueue.map(order => (
                    <ProductionCard 
                      key={order.id} 
                      order={order} 
                      getMaterialName={getMaterialName} 
                      onUpdateStatus={updateOrderStatus}
                      expanded={expandedOrderId === order.id}
                      onToggleExpand={() => toggleExpand(order.id)}
                    />
                 ))}
               </div>
             )}
          </div>

          {/* Pending / Issues Queue */}
          <div className="space-y-4">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Pendientes / Revisión
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{pendingQueue.length}</span>
             </h2>
             
             <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200 text-sm">
                {pendingQueue.map(order => (
                   <div key={order.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-slate-700">#{order.id.slice(-4)}</span>
                         <StatusBadge status={order.fileStatus} />
                      </div>
                      <h4 className="font-medium text-slate-800 truncate mb-1">{order.campaignName}</h4>
                      <p className="text-xs text-slate-500 mb-3">{order.items.length} items</p>
                      
                      <div className="flex gap-1 justify-end">
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Rojo')}
                             className={cn("p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500", order.fileStatus === 'Rojo' && "bg-red-100 text-red-600")}
                             title="Rechazar"
                         >
                            <AlertCircle className="h-4 w-4" />
                         </button>
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Amarillo')}
                             className={cn("p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-500", order.fileStatus === 'Amarillo' && "bg-amber-100 text-amber-600")}
                             title="En Revisión"
                         >
                            <FileIcon className="h-4 w-4" />
                         </button>
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Verde')}
                             className={cn("p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-500", order.fileStatus === 'Verde' && "bg-emerald-100 text-emerald-600")}
                             title="Aprobar"
                         >
                            <CheckCircle className="h-4 w-4" />
                         </button>
                      </div>
                      
                      {order.fileStatus === 'Verde' && order.status !== 'En Producción' && (
                         <button 
                           onClick={() => updateOrderStatus(order.id, 'En Producción')}
                           className="w-full mt-2 py-1.5 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800"
                         >
                            Mover a Producción
                         </button>
                      )}
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function ProductionCard({ order, getMaterialName, onUpdateStatus, expanded, onToggleExpand }: {
  order: Order;
  getMaterialName: (id: string) => string;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <div className={cn(
       "bg-white rounded-xl border transition-all shadow-sm overflow-hidden",
       expanded ? "border-blue-300 shadow-md ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300"
    )}>
       <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={onToggleExpand}>
          <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
             {order.id.slice(-4)}
          </div>
          
          <div className="flex-1 min-w-0">
             <h3 className="font-bold text-slate-800 truncate">{order.campaignName}</h3>
             <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                   <Clock className="h-3.5 w-3.5" /> {order.deliveryDate}
                </span>
                <span className="flex items-center gap-1">
                   <Printer className="h-3.5 w-3.5" /> {order.items.length} items
                </span>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'Despacho'); }}
                className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
             >
                Terminar
             </button>
             <div className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
             </div>
          </div>
       </div>

       {/* Expanded Details */}
       {expanded && (
         <div className="px-4 pb-4 bg-slate-50/50 border-t border-slate-100 pt-4 animate-in slide-in-from-top-1">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalles del Pedido</h4>
            <div className="space-y-2">
               {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-slate-200">
                     <div>
                        <span className="font-medium text-slate-700">{item.quantity}x</span> {getMaterialName(item.materialId)}
                     </div>
                     <div className="text-slate-500">
                        {item.width}x{item.height}cm
                     </div>
                  </div>
               ))}
            </div>
            
            <div className="flex gap-2 mt-4">
               <button className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded">
                  <FileIcon className="h-4 w-4" /> Ver Archivos
               </button>
               <button className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded">
                  <MoreHorizontal className="h-4 w-4" /> Más Opciones
               </button>
            </div>
         </div>
       )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
   if (status === 'Verde') return <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Aprobado" />;
   if (status === 'Amarillo') return <div className="h-2.5 w-2.5 rounded-full bg-amber-500" title="En Revisión" />;
   return <div className="h-2.5 w-2.5 rounded-full bg-red-500" title="Con Problemas" />;
}
