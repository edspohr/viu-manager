import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
  Package, 
  CheckCircle2, 
  AlertOctagon, 
  FileText
} from 'lucide-react';

export function ClientPortal() {
  const { customers, orders, approveOrder } = useStore();
  
  // Hardcoded for demo: "Fashion Park"
  const currentClient = customers.find(c => c.id === 'c1');
  const clientOrders = orders.filter(o => o.customerId === 'c1');
  
  const pendingApproval = clientOrders.filter(o => o.status === 'Por Aprobar');
  const activeOrders = clientOrders.filter(o => ['En Producción', 'Despacho'].includes(o.status));

  if (!currentClient) return <div>Cliente no encontrado</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
       {/* Welcome Header */}
       <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hola, {currentClient.name}</h1>
            <p className="text-slate-500 mt-1">Bienvenido a tu portal de gestión.</p>
          </div>
          
          {currentClient.debt > 0 && (
             <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-right-4">
                <div className="p-2 bg-orange-100 rounded-full">
                   <AlertOctagon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                   <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Deuda Pendiente</p>
                   <p className="text-2xl font-bold text-slate-900">
                     {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(currentClient.debt)}
                   </p>
                </div>
                <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors ml-4">
                   Pagar Ahora
                </button>
             </div>
          )}
       </div>

       {/* Pending Approvals */}
       {pendingApproval.length > 0 && (
          <section className="space-y-4">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <FileText className="h-5 w-5 text-blue-500" />
               Requiere tu Aprobación
             </h2>
             <div className="grid gap-4">
                {pendingApproval.map(order => (
                   <div key={order.id} className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Nueva Cotización</span>
                            <span className="text-slate-400 text-sm">{order.createdAt}</span>
                         </div>
                         <h3 className="text-lg font-bold text-slate-900">{order.campaignName}</h3>
                         <p className="text-slate-600 mt-1">
                            {order.items.length} items • Entrega estimada: <span className="font-medium text-slate-900">{order.deliveryDate}</span>
                         </p>
                         <p className="text-2xl font-bold text-slate-900 mt-2">
                           {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(order.totalAmount)}
                         </p>
                      </div>
                      
                      <button 
                        onClick={() => approveOrder(order.id)}
                        className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                         <CheckCircle2 className="h-5 w-5" />
                         Aprobar Digitalmente
                      </button>
                   </div>
                ))}
             </div>
          </section>
       )}

       {/* Active Orders */}
       <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Package className="h-5 w-5 text-slate-500" />
             Pedidos en Curso
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaña</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrega</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {activeOrders.length === 0 ? (
                      <tr>
                         <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                            No hay pedidos activos en este momento.
                         </td>
                      </tr>
                   ) : activeOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{order.campaignName}</p>
                            <p className="text-xs text-slate-500">ID: {order.id.toUpperCase()}</p>
                         </td>
                         <td className="px-6 py-4">
                            <span className={cn(
                               "px-2 py-1 rounded-full text-xs font-medium",
                               order.status === 'En Producción' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                               {order.status}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-sm text-slate-600">
                            {order.deliveryDate}
                         </td>
                         <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(order.totalAmount)}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </section>
    </div>
  );
}
