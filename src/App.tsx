
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from './lib/useAuth';
import { useStore } from './store/useStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { PendingScreen } from './components/auth/PendingScreen';
import { RoleManagerModal } from './components/auth/RoleManagerModal';
import { Sidebar } from './components/layout/Sidebar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ProductionCalendar } from './components/calendar/ProductionCalendar';
import { AuditPanel } from './components/layout/AuditPanel';
import { ApprovalPage } from './components/portal/ApprovalPage';
import { ClientPortalView } from './components/portal/ClientPortalView';
import type { UserRole } from './store/useStore';

function App() {
  const auth = useAuth();
  const { switchUser } = useStore();

  const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'calendar' | 'csv' | 'audit'>('board');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [_selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (orderId) setApprovalOrderId(orderId);
  }, []);

  // Sync Firebase auth user into Zustand store role
  useEffect(() => {
    if (auth.user && auth.user.role !== 'pending') {
      switchUser(auth.user.role as UserRole, auth.user.uid);
    }
  }, [auth.user, switchUser]);

  // ── Standalone approval page ───────────────────────────────────────────────
  if (approvalOrderId) {
    return (
      <>
        <ApprovalPage orderId={approvalOrderId} />
        <Toaster position="bottom-right" theme="light" richColors />
      </>
    );
  }

  // ── Auth loading ───────────────────────────────────────────────────────────
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!auth.user || !auth.firebaseUser) {
    return (
      <>
        <LoginScreen auth={auth} />
        <Toaster position="bottom-right" theme="dark" richColors />
      </>
    );
  }

  // ── Pending role ───────────────────────────────────────────────────────────
  if (auth.user.role === 'pending') {
    return (
      <>
        <PendingScreen user={auth.user} onSignOut={auth.signOut} />
        <Toaster position="bottom-right" theme="dark" richColors />
      </>
    );
  }

  // ── Client view ───────────────────────────────────────────────────────────
  if (auth.user.role === 'client') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
        <ClientPortalView />
        <Toaster position="bottom-right" theme="light" richColors />
      </div>
    );
  }

  // ── Main app (admin / superadmin / operations) ─────────────────────────────
  return (
    <div className="h-screen flex bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      <Sidebar
        user={auth.user}
        view={view}
        onViewChange={setView}
        onNewQuote={() => setIsAIModalOpen(true)}
        onPricingConfig={() => setIsConfigModalOpen(true)}
        onRoleManager={() => setIsRoleManagerOpen(true)}
        onSignOut={auth.signOut}
      />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {view === 'calendar' ? (
          <ProductionCalendar onOrderClick={(id) => { setSelectedOrderId(id); setView('board'); }} />
        ) : view === 'audit' ? (
          <AuditPanel />
        ) : (
          <KanbanBoard
            view={view}
            isAIModalOpen={isAIModalOpen}
            onAIModalClose={() => setIsAIModalOpen(false)}
            isConfigModalOpen={isConfigModalOpen}
            onConfigModalClose={() => setIsConfigModalOpen(false)}
          />
        )}
      </main>

      <RoleManagerModal
        isOpen={isRoleManagerOpen}
        onClose={() => setIsRoleManagerOpen(false)}
      />

      <Toaster position="bottom-right" theme="light" richColors />
    </div>
  );
}

export default App;
