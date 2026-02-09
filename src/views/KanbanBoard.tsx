import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Clock, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { Order } from '../data/mockData';

const columns = [
  { id: 'Leads', label: 'Leads / Solicitudes', color: 'bg-slate-100 border-slate-200' },
  { id: 'En Cotización', label: 'En Cotización', color: 'bg-blue-50 border-blue-200' },
  { id: 'Por Aprobar', label: 'Por Aprobar', color: 'bg-amber-50 border-amber-200' },
  { id: 'En Producción', label: 'En Producción', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'Despacho', label: 'Despacho', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'Cobranza', label: 'Cobranza', color: 'bg-rose-50 border-rose-200' },
];

export function KanbanBoard() {
  const { orders, customers, updateOrderStatus } = useStore();

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.name || 'Desconocido';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);
  };

  const handleMove = (orderId: string, currentStatus: string, direction: 'next' | 'prev') => {
    const currentIndex = columns.findIndex(c => c.id === currentStatus);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Bounds check
    if (newIndex < 0 || newIndex >= columns.length) return;

    const newStatus = columns[newIndex].id as Order['status'];
    updateOrderStatus(orderId, newStatus);
  };

  return (
    <div className="flex h-[calc(100vh-250px)] gap-4 overflow-x-auto pb-4">
      {columns.map((col, colIndex) => (
        <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col rounded-xl bg-slate-50 border border-slate-200 h-full">
          <div className={cn("p-3 border-b font-semibold text-sm text-slate-700 bg-white rounded-t-xl sticky top-0 z-10", col.color)}>
            {col.label}
             <span className="ml-2 text-xs font-normal text-slate-400">
               ({orders.filter(o => o.status === col.id).length})
             </span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-3">
            {orders.filter(o => o.status === col.id).map(order => (
               <div key={order.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                       {getCustomerName(order.customerId)}
                     </span>
                     {col.id === 'Cobranza' && (
                       <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertOctagon className="h-3 w-3" /> 
                          &gt;30d
                       </span>
                     )}
                  </div>
                  <h4 className="font-medium text-slate-800 text-sm leading-tight mb-1">{order.campaignName}</h4>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {order.items.map(i => `${i.quantity}x ${i.materialId}`).join(', ')}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                     <span className="text-xs font-medium text-slate-600">{formatPrice(order.totalAmount)}</span>
                     <div className="flex items-center gap-2">
                        {order.fileStatus === 'Verde' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        {order.fileStatus === 'Amarillo' && <Clock className="h-3 w-3 text-amber-500" />}
                     </div>
                  </div>

                  {/* Simple Hover Controls to Move Cards */}
                  <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-2 pointer-events-none">
                     {colIndex > 0 ? (
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleMove(order.id, order.status, 'prev'); }}
                           className="h-8 w-8 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 pointer-events-auto"
                           title="Mover Atrás"
                        >
                           &larr;
                        </button>
                     ) : <div />}
                     
                     {colIndex < columns.length - 1 && (
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleMove(order.id, order.status, 'next'); }}
                           className="h-8 w-8 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 pointer-events-auto"
                           title="Mover Adelante"
                        >
                           &rarr;
                        </button>
                     )}
                  </div>
               </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
