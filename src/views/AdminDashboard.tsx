import { SmartCotizador } from './SmartCotizador';
import { KanbanBoard } from './KanbanBoard';

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Top Section: Metrics or Quick Actions could go here */}
       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Flujo de Producción</h1>
             </div>
             <KanbanBoard />
          </div>
          
          <div className="space-y-4">
             <h2 className="text-lg font-bold text-slate-900">Cotizador Rápido</h2>
             <SmartCotizador />
             
             {/* Plant Capacity Widget */}
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Ocupación de Planta</h3>
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-amber-500 w-[85%] rounded-full" />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                   <span className="font-medium text-slate-700">Cama Plana</span>
                   <span className="font-bold text-amber-600">85%</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                   Alta demanda. Se requiere autorización para pedidos Express.
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
