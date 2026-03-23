import { Calendar } from 'lucide-react';
import { formatCLP } from '../../lib/formatters';
import type { Order } from '../../data/mockData';

interface ClientOrderCardProps {
  order: Order;
  onClick: () => void;
}

const STATUS_BAR: Record<Order['status'], string> = {
  'Solicitud':     'bg-zinc-400',
  'Por Aprobar':   'bg-amber-400',
  'En Producción': 'bg-blue-400',
  'Despacho':      'bg-purple-400',
  'Terminado':     'bg-emerald-400',
};

const STATUS_BADGE: Record<Order['status'], string> = {
  'Solicitud':     'bg-zinc-100 text-zinc-600',
  'Por Aprobar':   'bg-amber-100 text-amber-700',
  'En Producción': 'bg-blue-100 text-blue-700',
  'Despacho':      'bg-purple-100 text-purple-700',
  'Terminado':     'bg-emerald-100 text-emerald-700',
};

const STATUS_LABEL: Record<Order['status'], string> = {
  'Solicitud':     'Solicitud recibida',
  'Por Aprobar':   'Pendiente de aprobación',
  'En Producción': 'En producción',
  'Despacho':      'Listo para entrega',
  'Terminado':     'Entregado',
};

const FILE_STATUS_TEXT: Record<Order['fileStatus'], string> = {
  'Verde':    'Archivos aprobados',
  'Amarillo': 'Archivos en revisión',
  'Rojo':     'Archivos pendientes',
};



export function ClientOrderCard({ order, onClick }: ClientOrderCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 overflow-hidden flex flex-col"
    >
      {/* Status color bar */}
      <div className={`h-1.5 w-full ${STATUS_BAR[order.status]}`} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Campaign name */}
        <h3 className="font-bold text-zinc-900 text-base leading-tight line-clamp-2">
          {order.campaignName}
        </h3>

        {/* Status badge */}
        <span className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>

        {/* Delivery date */}
        {order.deliveryDate && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Calendar size={13} className="shrink-0" />
            <span>
              {new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-CL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
        )}

        {/* File status */}
        <p className={`text-xs font-medium ${
          order.fileStatus === 'Verde'
            ? 'text-emerald-600'
            : order.fileStatus === 'Amarillo'
            ? 'text-amber-600'
            : 'text-rose-600'
        }`}>
          {FILE_STATUS_TEXT[order.fileStatus]}
        </p>

        {/* Total — right-aligned, bottom */}
        {order.totalAmount > 0 && (
          <div className="mt-auto pt-3 border-t border-zinc-100 flex justify-end">
            <span className="font-mono font-bold text-zinc-900 text-sm">
              {formatCLP(order.totalAmount)}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
