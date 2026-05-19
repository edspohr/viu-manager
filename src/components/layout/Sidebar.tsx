import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, Download, Settings, LogOut,
  Sparkles, Users, ChevronDown, Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AppUser } from '../../lib/useAuth';
import type { UserRole } from '../../store/useStore';

const VIU_LOGO = '/viu-logo.png';

interface SidebarProps {
  user: AppUser;
  view: 'board' | 'calendar' | 'csv';
  onViewChange: (v: 'board' | 'calendar' | 'csv') => void;
  onNewQuote: () => void;
  onPricingConfig: () => void;
  onRoleManager: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS = [
  { id: 'board' as const, label: 'Órdenes', icon: LayoutDashboard },
  { id: 'calendar' as const, label: 'Calendario', icon: CalendarDays },
  { id: 'csv' as const, label: 'Exportar CSV', icon: Download },
] as const;

const ROLE_BADGE: Record<UserRole | 'pending', { label: string; cls: string }> = {
  superadmin: { label: 'Superadmin', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  admin: { label: 'Admin', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  operations: { label: 'Operaciones', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  client: { label: 'Cliente', cls: 'bg-zinc-600/40 text-zinc-300 border-zinc-500/30' },
  pending: { label: 'Pendiente', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

function canSeeNav(role: UserRole | 'pending', id: string) {
  if (role === 'client') return id === 'board';
  if (role === 'operations') return id !== 'csv';
  return true;
}

export function Sidebar({
  user, view, onViewChange, onNewQuote, onPricingConfig, onRoleManager, onSignOut,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const role = user.role;
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isSuperadmin = role === 'superadmin';
  const badge = ROLE_BADGE[role];

  return (
    <aside className="w-60 shrink-0 h-screen bg-zinc-950 border-r border-zinc-800/60 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-zinc-800/60 flex items-center gap-3">
        <img
          src={VIU_LOGO}
          alt="VIU Print"
          className="w-9 h-9 rounded-xl shadow-lg shrink-0"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            el.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-9 h-9 rounded-xl bg-amber-400 items-center justify-center font-bold text-zinc-900 text-lg shrink-0">
          V
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">VIU Manager</p>
          <p className="text-zinc-500 text-xs leading-tight">VIU Print</p>
        </div>
      </div>

      {/* New quote CTA */}
      {isAdmin && (
        <div className="px-4 pt-4">
          <button
            onClick={onNewQuote}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-amber-400/20"
          >
            <Sparkles size={15} />
            Nueva Cotización
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter((item) => canSeeNav(role, item.id)).map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} className={active ? 'text-amber-400' : ''} />
              {item.label}
            </button>
          );
        })}

        {/* Divider */}
        {(isSuperadmin || isAdmin) && (
          <div className="pt-3 mt-3 border-t border-zinc-800/60">
            <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
              Administración
            </p>

            {isSuperadmin && (
              <button
                onClick={onRoleManager}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Users size={16} />
                Usuarios
              </button>
            )}

            {isSuperadmin && (
              <button
                onClick={onPricingConfig}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Settings size={16} />
                Configuración
              </button>
            )}

            {/* Superadmin badge */}
            {isSuperadmin && (
              <div className="mt-2 flex items-center gap-1.5 px-3 py-1">
                <Shield size={11} className="text-purple-400 shrink-0" />
                <span className="text-[10px] text-purple-400 font-medium">Acceso completo</span>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-800/60 p-3 relative">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 overflow-hidden shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-300">
                {user.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user.displayName}</p>
            <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5', badge.cls)}>
              {badge.label}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={cn('text-zinc-500 transition-transform shrink-0', userMenuOpen && 'rotate-180')}
          />
        </button>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden"
            >
              <button
                onClick={() => { setUserMenuOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
