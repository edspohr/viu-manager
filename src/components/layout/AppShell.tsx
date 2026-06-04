import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Settings, LogOut, Users, ChevronDown } from 'lucide-react';
import type { AppUser } from '../../lib/useAuth';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';

export type AppView = 'quotations' | 'settings';

interface AppShellProps {
  user: AppUser;
  view: AppView;
  onViewChange: (view: AppView) => void;
  onRoleManager: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function AppShell({ user, view, onViewChange, onRoleManager, onSignOut, children }: AppShellProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const isSuperadmin = user.role === 'superadmin';

  const navItems: { id: AppView; label: string; icon: typeof FileText }[] = [
    { id: 'quotations', label: 'Cotizaciones', icon: FileText },
  ];
  if (isSuperadmin) {
    navItems.push({ id: 'settings', label: 'Configuración', icon: Settings });
  }

  return (
    <div className="h-screen flex flex-col text-ink font-sans overflow-hidden">
      {/* Top bar */}
      <header className="h-16 px-6 border-b border-zinc-200/80 bg-white/70 backdrop-blur-xl flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-10">
          <Logo size="md" />

          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                    active ? 'text-ink' : 'text-zinc-500 hover:text-ink hover:bg-zinc-100/70'
                  )}
                >
                  <Icon size={14} strokeWidth={2.2} />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-zinc-100 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-zinc-100/70 transition-colors duration-150"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white shadow-soft" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-viu-500 to-viu-600 text-ink flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-soft">
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold leading-none text-ink">{user.displayName || user.email}</p>
              <p className="label-micro leading-none mt-1">{user.role}</p>
            </div>
            <ChevronDown size={13} className={cn('text-zinc-400 transition-transform duration-150', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-zinc-200/80 rounded-xl shadow-overlay overflow-hidden z-50"
              >
                <div className="px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
                  <p className="text-sm font-semibold text-ink truncate">{user.displayName || user.email}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{user.email}</p>
                  <span className="inline-flex mt-2 px-2 py-0.5 bg-viu-100 text-viu-900 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
                {isSuperadmin && (
                  <button
                    onClick={() => { setProfileOpen(false); onRoleManager(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Users size={14} className="text-zinc-400" />
                    Gestionar usuarios
                  </button>
                )}
                <button
                  onClick={() => { setProfileOpen(false); onSignOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                >
                  <LogOut size={14} className="text-zinc-400" />
                  Cerrar sesión
                </button>
              </motion.div>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
