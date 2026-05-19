import { motion } from 'framer-motion';
import { Clock, LogOut } from 'lucide-react';
import type { AppUser } from '../../lib/useAuth';

interface PendingScreenProps {
  user: AppUser;
  onSignOut: () => void;
}

export function PendingScreen({ user, onSignOut }: PendingScreenProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#27272a_0%,_#09090b_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-5">
            <Clock size={24} className="text-amber-400" />
          </div>

          <h2 className="text-white font-bold text-xl mb-2">Cuenta pendiente</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Tu cuenta fue creada correctamente. Un administrador de VIU Print asignará tu rol de acceso en breve.
          </p>

          <div className="bg-zinc-800 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-zinc-500 text-xs mb-0.5">Registrado como</p>
            <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
            <p className="text-zinc-500 text-xs truncate">{user.email}</p>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
}
