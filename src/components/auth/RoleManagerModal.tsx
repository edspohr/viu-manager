import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AppUser } from '../../lib/useAuth';
import type { UserRole } from '../../store/useStore';
import { X, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const ROLES: (UserRole | 'pending')[] = ['superadmin', 'admin', 'operations', 'client', 'pending'];
const ROLE_LABELS: Record<UserRole | 'pending', string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  operations: 'Operaciones',
  client: 'Cliente',
  pending: 'Pendiente',
};
const ROLE_COLORS: Record<UserRole | 'pending', string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  operations: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  client: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface RoleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleManagerModal({ isOpen, onClose }: RoleManagerModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getDocs(collection(db, 'users')).then((snap) => {
      setUsers(snap.docs.map((d) => d.data() as AppUser));
      setLoading(false);
    });
  }, [isOpen]);

  const handleRoleChange = async (uid: string, newRole: UserRole | 'pending') => {
    setSaving(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
      toast.success('Rol actualizado');
    } catch {
      toast.error('Error al actualizar rol');
    }
    setSaving(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900">Gestión de usuarios</h2>
              <p className="text-xs text-zinc-500">{users.length} usuario{users.length !== 1 ? 's' : ''} registrados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        {/* User list */}
        <div className="divide-y divide-zinc-50 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Cargando usuarios…</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Sin usuarios registrados</div>
          ) : (
            users
              .sort((a, b) => {
                const order = ['superadmin', 'admin', 'operations', 'client', 'pending'];
                return order.indexOf(a.role) - order.indexOf(b.role);
              })
              .map((u) => (
                <div key={u.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-zinc-500">
                        {u.displayName?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate flex items-center gap-2">
                      {u.displayName}
                      {u.role === 'superadmin' && (
                        <Shield size={12} className="text-purple-500 shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                  </div>

                  {/* Role selector */}
                  <div className="shrink-0">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole | 'pending')}
                      disabled={saving === u.uid}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-opacity disabled:opacity-60',
                        ROLE_COLORS[u.role]
                      )}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
