import { useState, useMemo } from 'react';
import { AlertTriangle, Package, Calendar, TrendingUp, Mail, Phone } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCLP, formatDate } from '../../lib/formatters';
import { ClientOrderCard } from './ClientOrderCard';
import { OrderDetailModal } from '../modals/OrderDetailModal';

type FilterTab = 'Todas' | 'En Proceso' | 'Terminadas';

export function ClientPortalView() {
  const { orders, customers, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('Todas');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const customer = customers.find((c) => c.id === currentUser.id);
  const myOrders = useMemo(
    () => orders.filter((o) => o.customerId === currentUser.id),
    [orders, currentUser.id]
  );

  // Stats
  const activeOrders = useMemo(
    () => myOrders.filter((o) => o.status !== 'Terminado'),
    [myOrders]
  );

  const nextDelivery = useMemo(() => {
    const dates = activeOrders
      .filter((o) => o.deliveryDate)
      .map((o) => o.deliveryDate)
      .sort();
    return dates[0] ?? null;
  }, [activeOrders]);

  const activeTotal = useMemo(
    () => activeOrders.reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  // Filtered list
  const displayOrders = useMemo(() => {
    if (activeTab === 'En Proceso') return myOrders.filter((o) => o.status !== 'Terminado');
    if (activeTab === 'Terminadas') return myOrders.filter((o) => o.status === 'Terminado');
    return myOrders;
  }, [myOrders, activeTab]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
            V
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider leading-none mb-0.5">
              Mi Cuenta
            </p>
            <p className="font-bold text-zinc-900 text-base leading-none">
              {customer?.name ?? 'Cliente'}
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 hidden sm:block">VIU Print — Portal de Cliente</p>
      </header>

      {/* Debt banner */}
      {(customer?.debt ?? 0) > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Tienes un saldo pendiente de{' '}
            <span className="font-mono font-bold">{formatCLP(customer!.debt)}</span>.
            {' '}Comunícate con tu ejecutivo.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start gap-4">
            <div className="p-2.5 bg-zinc-100 rounded-xl">
              <Package size={18} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Órdenes activas
              </p>
              <p className="text-2xl font-bold text-zinc-900">{activeOrders.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start gap-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Calendar size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Próxima entrega
              </p>
              {nextDelivery ? (
                <p className="text-base font-bold text-zinc-900">
                  {formatDate(nextDelivery, { day: 'numeric', month: 'short' })}
                </p>
              ) : (
                <p className="text-2xl font-bold text-zinc-400">—</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start gap-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Total en proceso
              </p>
              <p className="text-base font-bold text-zinc-900 font-mono">
                {activeTotal > 0 ? formatCLP(activeTotal) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs + order grid */}
        <div>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
            {(['Todas', 'En Proceso', 'Terminadas'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                  activeTab === tab
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab}
                {tab === 'Todas' && (
                  <span className="ml-1.5 text-xs text-zinc-400">{myOrders.length}</span>
                )}
                {tab === 'En Proceso' && (
                  <span className="ml-1.5 text-xs text-zinc-400">{activeOrders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Grid */}
          {displayOrders.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto mb-4 text-zinc-200" />
              <p className="text-sm font-semibold text-zinc-500 mb-1">No tienes órdenes activas</p>
              <p className="text-xs text-zinc-400 mb-6">
                {activeTab === 'Terminadas'
                  ? 'No hay órdenes terminadas aún.'
                  : 'Cuando crees una nueva orden, aparecerá aquí.'}
              </p>
              <div className="inline-flex flex-col items-start gap-2 bg-zinc-100 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Contacto</p>
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Mail size={14} className="text-zinc-400" />
                  <span>ventas@viuprint.cl</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone size={14} className="text-zinc-400" />
                  <span>+56 2 2345 6789</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayOrders.map((order) => (
                <ClientOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrderId(order.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order detail modal (client view) */}
      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
