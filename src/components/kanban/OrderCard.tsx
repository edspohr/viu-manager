import React from 'react';
import { motion } from 'framer-motion';
import { type Variants } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCLP, formatDate } from '../../lib/formatters';
import type { Order, Customer, Material } from '../../data/mockData';

interface OrderCardProps {
  order: Order;
  customer: Customer | undefined;
  materials: Material[];
  bouncing?: boolean;
  onClick?: () => void;
}

const cardVariants: Variants = {
  idle: { scale: 1 },
  bounce: { scale: [1, 1.05, 0.97, 1.01, 1] as number[] },
};

export const OrderCard = React.memo(function OrderCard({
  order,
  customer,
  materials,
  bouncing = false,
  onClick,
}: OrderCardProps) {
  const hasDebt = (customer?.debt ?? 0) > 0;

  // Up to 3 unique material names from items
  const materialBadges = [
    ...new Set(
      order.items.map(
        (item) =>
          materials.find((m) => m.id === item.materialId)?.name ?? item.materialId
      )
    ),
  ].slice(0, 3);

  return (
    <motion.div
      variants={cardVariants}
      animate={bouncing ? 'bounce' : 'idle'}
      transition={{ duration: 0.4, type: 'tween' }}
      onClick={onClick}
      className={cn(
        'group bg-white p-4 rounded-xl border border-zinc-200 shadow-sm',
        'hover:shadow-lg hover:border-zinc-300 transition-all duration-150 cursor-pointer relative',
        'border-l-4',
        hasDebt ? 'border-l-amber-400' : 'border-l-zinc-200'
      )}
    >
      {/* Top row: campaign name + status dot (+ AI icon) */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-zinc-900 text-sm leading-tight line-clamp-2 pr-1">
          {order.campaignName}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {order.aiGenerated && (
            <Sparkles size={11} className="text-zinc-400" />
          )}
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              order.fileStatus === 'Rojo'
                ? 'bg-rose-500 animate-pulse'
                : order.fileStatus === 'Amarillo'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            )}
          />
        </div>
      </div>

      {/* Row 2: customer name */}
      <p className="text-xs text-zinc-500 font-medium mb-2.5">
        {customer?.name ?? '—'}
      </p>

      {/* Row 3: material badges */}
      {materialBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {materialBadges.map((name) => (
            <span
              key={name}
              className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-medium leading-none"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: order ID | delivery date | total */}
      <div className="flex items-center justify-between text-xs text-zinc-400 mt-auto pt-1">
        <span className="font-mono text-zinc-400">{order.id}</span>
        <div className="flex items-center gap-2">
          {order.deliveryDate && (
            <span className="flex items-center gap-1 bg-zinc-50 px-2 py-0.5 rounded-md text-zinc-500 border border-zinc-100">
              <Calendar size={10} />
              {formatDate(order.deliveryDate, { day: 'numeric', month: 'short' })}
            </span>
          )}
          {order.totalAmount > 0 && (
            <span className="font-mono font-medium text-zinc-600">
              {formatCLP(order.totalAmount)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
