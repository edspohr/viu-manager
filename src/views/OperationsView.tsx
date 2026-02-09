import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
   Printer,
   Scissors,
   AlertCircle,
   CheckCircle,
   Clock,
   FileIcon
} from 'lucide-react';

export function OperationsView() {
  const { orders, updateFileStatus, updateOrderStatus, materials } = useStore();
  
  // Filter for orders relevant to operations (Approved, In Production)
  const productionOrders = orders
    .filter(o => ['En Producción', 'Por Aprobar'].includes(o.status) || (o.status === 'Leads' && o.fileStatus !== 'Verde'))
    .sort((a, b) => {
       // Mock priority sort by delivery date
       if (!a.deliveryDate) return 1;
       if (!b.deliveryDate) return -1;
       return a.deliveryDate.localeCompare(b.deliveryDate);
    });

  const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || id;

  const handleStatusChange = (orderId: string, newStatus: 'Rojo' | 'Amarillo' | 'Verde') => {
     updateFileStatus(orderId, newStatus);
     // Auto-move to production if green? (Optional logic)
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Cola de Producción</h1>
          <div className="flex gap-2">
             <span className="flex items-center gap-1 text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                <Printer className="h-4 w-4" /> 55 planchas/día
             </span>
             <span className="flex items-center gap-1 text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                <Scissors className="h-4 w-4" /> Mesa 1: OK
             </span>
          </div>
       </div>

       <div className="grid gap-4">
          {productionOrders.map(order => (
             <div key={order.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row items-start lg:items-center gap-6 group hover:border-slate-300 transition-all">
                {/* Status Indicator Bar */}
                <div className={cn(
                   "w-2 self-stretch rounded-full flex-shrink-0 lg:w-2 lg:h-16 hidden lg:block",
                   order.fileStatus === 'Verde' ? "bg-emerald-500" : 
                   order.fileStatus === 'Amarillo' ? "bg-amber-500" : "bg-red-500"
                )} />
                
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">#{order.id.slice(-4)}</span>
                      <span className={cn(
                         "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                         order.status === 'En Producción' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                      )}>
                         {order.status}
                      </span>
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 truncate">{order.campaignName}</h3>
                   <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                         <Clock className="h-4 w-4 text-slate-400" />
                         <span className="font-medium text-slate-900">{order.deliveryDate || 'Sin fecha'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <Printer className="h-4 w-4 text-slate-400" />
                         <span>{order.items.length > 0 ? getMaterialName(order.items[0].materialId) : 'Sin material'}</span>
                      </div>
                   </div>
                </div>

                {/* File Status Controls */}
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Archivos</span>
                   
                   <button 
                     onClick={() => handleStatusChange(order.id, 'Rojo')}
                     className={cn(
                        "p-2 rounded-md transition-all hover:scale-105",
                        order.fileStatus === 'Rojo' ? "bg-red-100 text-red-600 ring-2 ring-red-500 ring-offset-1" : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                     )}
                     title="Corrupto / No Recibido"
                   >
                      <AlertCircle className="h-5 w-5" />
                   </button>
                   
                   <button 
                     onClick={() => handleStatusChange(order.id, 'Amarillo')}
                     className={cn(
                        "p-2 rounded-md transition-all hover:scale-105",
                        order.fileStatus === 'Amarillo' ? "bg-amber-100 text-amber-600 ring-2 ring-amber-500 ring-offset-1" : "hover:bg-amber-50 text-slate-400 hover:text-amber-500"
                     )}
                     title="En Revisión"
                   >
                      <FileIcon className="h-5 w-5" />
                   </button>
                   
                   <button 
                     onClick={() => handleStatusChange(order.id, 'Verde')}
                     className={cn(
                        "p-2 rounded-md transition-all hover:scale-105",
                        order.fileStatus === 'Verde' ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500 ring-offset-1" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-500"
                     )}
                     title="Listo para RIP"
                   >
                      <CheckCircle className="h-5 w-5" />
                   </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                   {order.status !== 'En Producción' && order.fileStatus === 'Verde' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'En Producción')}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                      >
                         Pasar a Producción
                      </button>
                   )}
                   {order.status === 'En Producción' && (
                       <button 
                        onClick={() => updateOrderStatus(order.id, 'Despacho')}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                         Terminar
                      </button>
                   )}
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
