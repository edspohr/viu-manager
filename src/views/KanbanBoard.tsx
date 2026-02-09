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

  const getColumnTotal = (status: string) => {
    const total = orders
      .filter(o => o.status === status)
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(total);
  };

  const getSLAStyle = (dateStr: string, status: string) => {
    if (status === 'Despacho' || status === 'Cobranza') return ''; // Delivered items don't have SLA pressure
    if (!dateStr) return '';
    
    const delivery = new Date(dateStr);
    const now = new Date();
    const diffHours = (delivery.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'border-red-500 ring-4 ring-red-100 animate-pulse'; // Late
    if (diffHours < 48) return 'border-amber-500 ring-2 ring-amber-50'; // Warning
    return 'border-slate-200';
  };

  return (
    <div className="flex h-[calc(100vh-250px)] gap-4 overflow-x-auto pb-4">
      {columns.map((col, colIndex) => (
        <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col rounded-xl bg-slate-50 border border-slate-200 h-full">
          <div className={cn("p-3 border-b border-slate-200 bg-white rounded-t-xl sticky top-0 z-10", col.color)}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm text-slate-800">{col.label}</span>
              <span className="text-xs font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-full">
                {orders.filter(o => o.status === col.id).length}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500 font-medium">
               {getColumnTotal(col.id)}
            </div>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-3">
            {orders.filter(o => o.status === col.id).map(order => (
               <div 
                 key={order.id} 
                 className={cn(
                   "bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer group relative", 
                   getSLAStyle(order.deliveryDate, order.status)
                 )}
               >
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                       {getCustomerName(order.customerId)}
                     </span>
                     {col.id === 'Cobranza' && (
                       <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertOctagon className="h-3 w-3" /> 
                          &gt;30d
                       </span>
                     )}
                  </div>
                  <h4 className="font-medium text-slate-800 text-sm leading-tight mb-2">{order.campaignName}</h4>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                    {order.items.map(i => `${i.quantity}x ${i.materialId}`).join(', ')}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                     <span className="text-xs font-bold text-slate-700">{formatPrice(order.totalAmount)}</span>
                     <div className="flex items-center gap-2">
                        {order.fileStatus === 'Verde' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        {order.fileStatus === 'Amarillo' && <Clock className="h-3 w-3 text-amber-500" />}
                        {order.fileStatus === 'Rojo' && <AlertOctagon className="h-3 w-3 text-red-500" />}
                     </div>
                  </div>

                  {/* Simple Hover Controls to Move Cards */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors flex items-center justify-between px-1 pointer-events-none">
                     {colIndex > 0 ? (
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleMove(order.id, order.status, 'prev'); }}
                           className="h-8 w-8 bg-white/90 backdrop-blur text-slate-600 rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all pointer-events-auto opacity-0 group-hover:opacity-100 -ml-2"
                           title="Mover Atrás"
                        >
                           &larr;
                        </button>
                     ) : <div />}
                     
                     {colIndex < columns.length - 1 && (
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleMove(order.id, order.status, 'next'); }}
                           className="h-8 w-8 bg-white/90 backdrop-blur text-slate-600 rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all pointer-events-auto opacity-0 group-hover:opacity-100 -mr-2"
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
