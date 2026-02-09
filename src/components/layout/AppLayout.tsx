import React, { useState } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  Menu, 
  LogOut, 
  ChevronDown,
  Factory,
  Briefcase
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Factory className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-white text-lg tracking-tight">VIU Manager</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
          {currentUser === 'admin' && (
            <>
              <SidebarItem icon={Users} label="Clientes" />
              <SidebarItem icon={Briefcase} label="Cotizaciones" />
            </>
          )}
          <SidebarItem icon={Settings} label="Configuración" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold", getRoleColor(currentUser))}>
                {currentUser[0].toUpperCase()}
             </div>
             {sidebarOpen && (
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-white truncate">{getRoleLabel(currentUser)}</p>
                 <p className="text-xs text-slate-500 truncate">En línea</p>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarOpen ? "ml-64" : "ml-20")}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <LogOut className="h-5 w-5 text-slate-400" />
            </div>
            
            {/* Dev Mode Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 text-sm font-medium text-slate-700 transition-colors">
                <span className={cn("w-2 h-2 rounded-full", getRoleColor(currentUser))} />
                <span>Vista: {getRoleLabel(currentUser)}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dev Mode Switcher
                </div>
                <div className="p-1">
                  <RoleOption 
                    active={currentUser === 'admin'} 
                    onClick={() => switchUser('admin')}
                    label="Admin (Paulina)"
                    desc="Control total, Cotizador"
                    color="bg-blue-600"
                  />
                  <RoleOption 
                    active={currentUser === 'client'} 
                    onClick={() => switchUser('client')}
                    label="Cliente (Fashion Park)"
                    desc="Portal, Aprobación"
                    color="bg-emerald-600"
                  />
                  <RoleOption 
                    active={currentUser === 'operations'} 
                    onClick={() => switchUser('operations')}
                    label="Operaciones (Taller)"
                    desc="Cola, Archivos"
                    color="bg-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    )}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function RoleOption({ active, onClick, label, desc, color }: { active: boolean, onClick: () => void, label: string, desc: string, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md transition-colors flex items-start gap-3",
        active ? "bg-slate-50" : "hover:bg-slate-50"
      )}
    >
      <div className={cn("mt-1 w-2 h-2 rounded-full flex-shrink-0", color)} />
      <div>
        <p className={cn("text-sm font-medium", active ? "text-slate-900" : "text-slate-700")}>{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </button>
  );
}
