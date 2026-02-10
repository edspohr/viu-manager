import { useState } from 'react';
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
   MoreHorizontal,
   AlertTriangle,
   ShieldAlert
} from 'lucide-react';
import type { Order } from '../data/mockData';
import { Modal } from '../components/common/Modal';
import { toast } from 'sonner';

export function OperationsView() {
  const { orders, updateFileStatus, updateOrderStatus, materials } = useStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showNuclearAlert, setShowNuclearAlert] = useState(false);
  const [supervisorKey, setSupervisorKey] = useState('');
  
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

  const overrideCapacity = () => {
    if (supervisorKey.length < 3) {
      toast.error('Clave de supervisor inválida');
      return;
    }
    toast.success('Horas Extra Autorizadas', {
      description: 'El turno de noche ha sido habilitado.'
    });
    setShowNuclearAlert(false);
    setSupervisorKey('');
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cola de Producción</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gestión de Taller y Archivos</p>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => setShowNuclearAlert(true)}
                className="flex items-center gap-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full border border-red-200 transition-colors"
                title="Simular Carga Crítica"
             >
                <AlertTriangle className="h-4 w-4" /> 95% Capacidad
             </button>
             <span className="flex items-center gap-1 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                <Printer className="h-4 w-4" /> 55 planchas/día
             </span>
             <span className="flex items-center gap-1 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                <Scissors className="h-4 w-4" /> Mesa 1: OK
             </span>
          </div>
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Queue - Ready for Production */}
          <div className="lg:col-span-2 space-y-4">
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
               Producción Activa
               <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{readyQueue.length}</span>
             </h2>

             {readyQueue.length === 0 ? (
               <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
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
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Pendientes / Revisión
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{pendingQueue.length}</span>
             </h2>
             
             <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700 text-sm">
                {pendingQueue.map(order => (
                   <div key={order.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-slate-700 dark:text-slate-300">#{order.id.slice(-4)}</span>
                         <StatusBadge status={order.fileStatus} />
                      </div>
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate mb-1">{order.campaignName}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{order.items.length} items</p>
                      
                      <div className="flex gap-1 justify-end">
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Rojo')}
                             className={cn("p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500", order.fileStatus === 'Rojo' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400")}
                             title="Rechazar"
                         >
                            <AlertCircle className="h-4 w-4" />
                         </button>
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Amarillo')}
                             className={cn("p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-500", order.fileStatus === 'Amarillo' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400")}
                             title="En Revisión"
                         >
                            <FileIcon className="h-4 w-4" />
                         </button>
                         <button 
                             onClick={() => handleStatusChange(order.id, 'Verde')}
                             className={cn("p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500", order.fileStatus === 'Verde' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400")}
                             title="Aprobar"
                         >
                            <CheckCircle className="h-4 w-4" />
                         </button>
                      </div>
                      
                      {order.fileStatus === 'Verde' && order.status !== 'En Producción' && (
                         <button 
                           onClick={() => updateOrderStatus(order.id, 'En Producción')}
                           className="w-full mt-2 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded hover:bg-slate-800 dark:hover:bg-slate-600"
                         >
                            Mover a Producción
                         </button>
                      )}
                   </div>
                ))}
             </div>
          </div>
       </div>

       {/* Nuclear Alert Modal */}
       <Modal
          isOpen={showNuclearAlert}
          onClose={() => setShowNuclearAlert(false)}
          title={
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              ALERTA DE CAPACIDAD
            </div>
          }
          variant="alert"
          footer={
             <div className="flex w-full justify-end gap-3">
                <button 
                   onClick={() => setShowNuclearAlert(false)}
                   className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium"
                >
                   Cancelar
                </button>
                <button 
                   onClick={overrideCapacity}
                   className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm"
                >
                   Autorizar Sobrecarga
                </button>
             </div>
          }
       >
         <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-200 text-sm">
               <p className="font-bold mb-1">PLANTA AL 95% DE CAPACIDAD</p>
               <p>Ingresar nuevos pedidos retrasará las entregas actuales en 24 horas. Se requiere autorización de supervisor para habilitar horas extra.</p>
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                 Clave de Supervisor
               </label>
               <input 
                  type="password" 
                  value={supervisorKey}
                  onChange={(e) => setSupervisorKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
               />
            </div>
         </div>
       </Modal>
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
       "bg-white dark:bg-slate-800 rounded-xl border transition-all shadow-sm overflow-hidden",
       expanded ? "border-blue-300 dark:border-blue-700 shadow-md ring-1 ring-blue-200 dark:ring-blue-900" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
    )}>
       <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={onToggleExpand}>
          <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
             {order.id.slice(-4)}
          </div>
          
          <div className="flex-1 min-w-0">
             <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">{order.campaignName}</h3>
             <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
             <div className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
             </div>
          </div>
       </div>

       {/* Expanded Details */}
       {expanded && (
         <div className="px-4 pb-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 pt-4 animate-in slide-in-from-top-1">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Detalles del Pedido</h4>
            <div className="space-y-2">
               {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                     <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.quantity}x</span> <span className="text-slate-600 dark:text-slate-400">{getMaterialName(item.materialId)}</span>
                     </div>
                     <div className="text-slate-500 dark:text-slate-500">
                        {item.width}x{item.height}cm
                     </div>
                  </div>
               ))}
            </div>
            
            <div className="flex gap-2 mt-4">
               <button className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <FileIcon className="h-4 w-4" /> Ver Archivos
               </button>
               <button className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
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
