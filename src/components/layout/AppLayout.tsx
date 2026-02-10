import React, { useState } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  Menu, 
  LogOut, 
  ChevronDown,
  Factory,
  History,
  Rocket,
  Plus
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, switchUser } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-blue-600';
      case 'client': return 'bg-emerald-600';
      case 'operations': return 'bg-amber-600';
      default: return 'bg-slate-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administración';
      case 'client': return 'Portal Cliente';
      case 'operations': return 'Taller / Operaciones';
      default: return 'Usuario';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50 shadow-xl",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-900/20">
              <Factory className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-white text-xl tracking-tight">VIU Manager</span>}
          </div>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2">
          {/* Primary Action */}
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-6 transition-all group",
            "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-0.5"
          )}>
            <Rocket className="h-5 w-5 fill-white/20" />
            {sidebarOpen && <span className="font-bold">Cotizar Ahora</span>}
          </button>

          <div className="space-y-1">
             <p className={cn("px-4 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-2 transition-opacity", !sidebarOpen && "opacity-0")}>Menu</p>
             <SidebarItem icon={LayoutDashboard} label="Tablero" active />
             <SidebarItem icon={History} label="Historial" />
             <SidebarItem icon={Users} label="Clientes" />
             <SidebarItem icon={Settings} label="Configuración" />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-slate-800", getRoleColor(currentUser))}>
                {currentUser[0].toUpperCase()}
             </div>
             {sidebarOpen && (
               <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                 <p className="text-sm font-medium text-white truncate">{getRoleLabel(currentUser)}</p>
                 <p className="text-xs text-slate-500 truncate">En línea</p>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300 min-h-screen", sidebarOpen ? "ml-64" : "ml-20")}>
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 text-sm font-medium text-slate-700 transition-all">
                <span className={cn("w-2 h-2 rounded-full", getRoleColor(currentUser))} />
                <span>{getRoleLabel(currentUser)}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2 z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cambiar Rol (Dev Mode)
                </div>
                <div className="p-1">
                  <RoleOption 
                    active={currentUser === 'admin'} 
                    onClick={() => switchUser('admin')}
                    label="Admin (Paulina)"
                    color="bg-blue-600"
                  />
                  <RoleOption 
                    active={currentUser === 'client'} 
                    onClick={() => switchUser('client')}
                    label="Cliente (Fashion Park)"
                    color="bg-emerald-600"
                  />
                  <RoleOption 
                    active={currentUser === 'operations'} 
                    onClick={() => switchUser('operations')}
                    label="Operaciones (Taller)"
                    color="bg-amber-600"
                  />
                </div>
              </div>
            </div>
            
            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Cerrar Sesión">
               <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
             {children}
          </div>
        </main>
      </div>

      {/* Floating Action Button (Mobile/Global) */}
      <button className="fixed bottom-8 right-8 h-14 w-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 md:hidden">
         <Plus className="h-8 w-8" />
      </button>

      <Toaster position="bottom-right" richColors theme="light" closeButton />
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active }: { icon: React.ElementType, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
      active 
        ? "bg-slate-800 text-white shadow-md shadow-black/20" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    )}>
      <Icon className={cn("h-5 w-5 transition-colors", active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
      <span>{label}</span>
    </button>
  );
}

function RoleOption({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3",
        active ? "bg-slate-50" : "hover:bg-slate-50"
      )}
    >
      <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", color)} />
      <span className={cn("text-sm font-medium", active ? "text-slate-900" : "text-slate-600")}>{label}</span>
    </button>
  );
}
