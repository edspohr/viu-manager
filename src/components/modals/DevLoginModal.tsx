
import { useState } from 'react';
import { useStore, type UserRole } from '../../store/useStore';
import { Users, Shield, Briefcase, UserCheck } from 'lucide-react';

export const DevLoginModal = () => {
  const { switchUser } = useStore();
  const [isOpen, setIsOpen] = useState(true);

  // Close modal if a user is already selected (optional, or keep it open for dev purposes)
  // For this refactor, we want it to be an entry point, but maybe dismissible?
  // The prompt says "Entry Point... on app load". Let's keep it simple.

  const handleLogin = (role: UserRole) => {
    switchUser(role);
    setIsOpen(false);
  };

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 left-4 z-50 bg-zinc-900 text-zinc-400 p-2 rounded-full hover:text-white transition-colors shadow-lg border border-zinc-800"
      title="Switch Role"
    >
      <Users size={16} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
            <Shield className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">VIU Manager</h2>
          <p className="text-zinc-400 mt-2 text-sm">Select a role to enter the system</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleLogin('client')}
            className="group flex flex-col items-center p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all duration-200"
          >
            <UserCheck className="mb-3 text-zinc-400 group-hover:text-emerald-400 transition-colors" size={28} />
            <span className="text-zinc-200 font-medium">Soy Cliente</span>
            <span className="text-xs text-zinc-500 mt-1">Restricted View</span>
          </button>

          <button
            onClick={() => handleLogin('operations')}
            className="group flex flex-col items-center p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all duration-200"
          >
            <Briefcase className="mb-3 text-zinc-400 group-hover:text-amber-400 transition-colors" size={28} />
            <span className="text-zinc-200 font-medium">Soy Operaciones</span>
            <span className="text-xs text-zinc-500 mt-1">Execution View</span>
          </button>

          <button
            onClick={() => handleLogin('admin')}
            className="group flex flex-col items-center p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all duration-200"
          >
            <Shield className="mb-3 text-zinc-400 group-hover:text-indigo-400 transition-colors" size={28} />
            <span className="text-zinc-200 font-medium">Soy Admin</span>
            <span className="text-xs text-zinc-500 mt-1">Full Control</span>
          </button>

          <button
            onClick={() => handleLogin('superadmin')}
            className="group flex flex-col items-center p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all duration-200"
          >
            <Shield className="mb-3 text-zinc-400 group-hover:text-rose-400 transition-colors" size={28} />
            <span className="text-zinc-200 font-medium">Soy SuperAdmin</span>
            <span className="text-xs text-zinc-500 mt-1">Config Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
