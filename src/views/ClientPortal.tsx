import { useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
  Package, 
  CheckCircle2, 
  AlertOctagon, 
  FileText,
  PenTool,
  Lock
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { toast } from 'sonner';

export function ClientPortal() {
  const { customers, orders, approveOrder } = useStore();
  const [selectedOrderForApproval, setSelectedOrderForApproval] = useState<string | null>(null);
  const [rut, setRut] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  
  // Hardcoded for demo: "Fashion Park"
  const currentClient = customers.find(c => c.id === 'c1');
  const clientOrders = orders.filter(o => o.customerId === 'c1');
  
  const pendingApproval = clientOrders.filter(o => o.status === 'Por Aprobar');
  const activeOrders = clientOrders.filter(o => ['En Producción', 'Despacho'].includes(o.status));

  if (!currentClient) return <div>Cliente no encontrado</div>;

  const orderToApprove = orders.find(o => o.id === selectedOrderForApproval);

  const handleApprove = () => {
    if (!orderToApprove) return;
    if (!rut) {
      toast.error('Debes ingresar tu RUT para firmar');
      return;
    }
    if (!isSigned) {
      toast.error('Debes firmar el documento');
      return;
    }

    approveOrder(orderToApprove.id);
    toast.success('Orden Aprobada y enviada a Producción', {
      description: `Pedido ${orderToApprove.campaignName} iniciado.`
    });
    setSelectedOrderForApproval(null);
    setRut('');
    setIsSigned(false);
  };

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
                        onClick={() => setSelectedOrderForApproval(order.id)}
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

       {/* Signature Modal */}
       <Modal
          isOpen={!!selectedOrderForApproval}
          onClose={() => setSelectedOrderForApproval(null)}
          title="Firma Digital de Aprobación"
          variant="signature"
          footer={
             <div className="flex w-full items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                   <Lock className="h-3 w-3" /> Encriptado SSL 256-bit
                </p>
                <div className="flex gap-3">
                   <button 
                      onClick={() => setSelectedOrderForApproval(null)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                   >
                      Cancelar
                   </button>
                   <button 
                      onClick={handleApprove}
                      disabled={!isSigned || !rut}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                   >
                      Confirmar Orden
                   </button>
                </div>
             </div>
          }
       >
          <div className="space-y-6">
             <div className="bg-slate-50 p-6 rounded-xl text-center border border-slate-200">
                <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Monto Total a Aprobar</p>
                <p className="text-4xl font-bold text-slate-900">
                   {orderToApprove && new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(orderToApprove.totalAmount)}
                </p>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">RUT / DNI del Aprobador</label>
                   <input 
                      type="text" 
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      placeholder="12.345.678-9"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Firma en el recuadro</label>
                   <div 
                      onClick={() => setIsSigned(true)}
                      className={cn(
                         "h-32 w-full rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all relative overflow-hidden",
                         isSigned ? "border-emerald-500 bg-emerald-50/30" : "border-slate-300 bg-slate-50 hover:border-slate-400"
                      )}
                   >
                      {!isSigned ? (
                         <div className="text-slate-400 flex flex-col items-center gap-2">
                            <PenTool className="h-6 w-6" />
                            <span className="text-sm">Click aquí para firmar</span>
                         </div>
                      ) : (
                         <div className="w-full h-full flex items-center justify-center">
                            <svg viewBox="0 0 200 60" className="w-48 text-emerald-600 opacity-80" fill="none" stroke="currentColor" strokeWidth="3">
                               <path d="M10,50 Q40,10 70,40 T150,20" />
                            </svg>
                            <div className="absolute top-2 right-2 bg-white/80 backdrop-blur rounded-full p-1 shadow-sm">
                               <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                         </div>
                      )}
                   </div>
                   <p className="text-xs text-slate-500 mt-1">Al firmar, aceptas los Términos y Condiciones de Producción.</p>
                </div>
             </div>
          </div>
       </Modal>
    </div>
  );
}
