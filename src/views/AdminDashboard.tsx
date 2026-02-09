import { SmartCotizador } from './SmartCotizador';
import { KanbanBoard } from './KanbanBoard';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { AlertTriangle } from 'lucide-react';

export function AdminDashboard() {
  const { orders } = useStore();

  // Calculate Capacity based on 'En Producción' total amount
  // Mock Max Capacity = 3,000,000 CLP at same time
  const maxCapacity = 3000000;
  const currentProductionLoad = orders
    .filter(o => o.status === 'En Producción')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  
  const capacityPercentage = Math.min(100, Math.round((currentProductionLoad / maxCapacity) * 100));

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
                   <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000",
                        capacityPercentage > 90 ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-amber-500"
                      )}
                      style={{ width: `${capacityPercentage}%` }} 
                   />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                   <span className="font-medium text-slate-700">Cama Plana</span>
                   <span className={cn("font-bold", capacityPercentage > 90 ? "text-red-600" : "text-amber-600")}>
                     {capacityPercentage}%
                   </span>
                </div>
                {capacityPercentage > 90 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700 flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4" />
                     Planta Saturada. Autorización requerida.
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                   Capacidad basada en carga financiera de producción actual (${(currentProductionLoad/1000000).toFixed(1)}M / ${(maxCapacity/1000000).toFixed(1)}M)
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
