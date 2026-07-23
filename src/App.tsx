import { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from './lib/useAuth';
import { useStore } from './store/useStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { PendingScreen } from './components/auth/PendingScreen';
import { RoleManagerModal } from './components/auth/RoleManagerModal';
import { AppShell, type AppView } from './components/layout/AppShell';
import { QuotationsList } from './components/quotations/QuotationsList';
import { QuotationDetail } from './components/quotations/QuotationDetail';
import { SettingsPage } from './components/settings/SettingsPage';
import { AIQuoteWizard } from './components/wizard/AIQuoteWizard';
import { ApprovalPage } from './components/portal/ApprovalPage';
import { subscribeToSharedData } from './lib/firestoreListeners';
import { hasRunMigration, runFirstLoginMigration } from './lib/firestoreMigration';
import type { UserRole } from './store/useStore';

function App() {
  const auth = useAuth();
  const { switchUser } = useStore();

  // Read the order id from the URL once — pure derivation, no effect needed.
  const approvalOrderId = useMemo<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('order');
  }, []);
  const [view, setView] = useState<AppView>('quotations');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Sync Firebase auth role into Zustand store
  useEffect(() => {
    if (auth.user && auth.user.role !== 'pending') {
      // Only admin / superadmin reach the app now
      if (auth.user.role === 'admin' || auth.user.role === 'superadmin') {
        switchUser(auth.user.role as UserRole, auth.user.uid);
      }
    }
  }, [auth.user, switchUser]);

  // Firestore listener lifecycle. Runs once the user is authenticated with a
  // staff role; unsubscribes on sign-out / role loss. Also handles the one-time
  // per-device migration that uploads locally-modified data into Firestore.
  useEffect(() => {
    const role = auth.user?.role;
    if (role !== 'admin' && role !== 'superadmin') return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      if (!hasRunMigration()) {
        try {
          const s = useStore.getState();
          const report = await runFirstLoginMigration({
            materials: s.materials,
            customers: s.customers,
            orders: s.orders,
            pricingConfig: s.pricingConfig,
          });
          console.info('[viu] migration report', report);
        } catch (err) {
          console.error('[viu] migration failed — will retry on next reload', err);
        }
      }
      if (cancelled) return;
      unsubscribe = subscribeToSharedData();
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [auth.user?.role]);

  // ── Standalone approval page (public link) ────────────────────────────────
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
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

  // ── Pending or deprecated role ─────────────────────────────────────────────
  if (auth.user.role !== 'admin' && auth.user.role !== 'superadmin') {
    return (
      <>
        <PendingScreen user={auth.user} onSignOut={auth.signOut} />
        <Toaster position="bottom-right" theme="dark" richColors />
      </>
    );
  }

  // ── Main app ───────────────────────────────────────────────────────────────
  return (
    <AppShell
      user={auth.user}
      view={view}
      onViewChange={(v) => { setView(v); setSelectedOrderId(null); }}
      onRoleManager={() => setIsRoleManagerOpen(true)}
      onSignOut={auth.signOut}
    >
      {view === 'quotations' && selectedOrderId ? (
        <QuotationDetail
          orderId={selectedOrderId}
          onBack={() => setSelectedOrderId(null)}
        />
      ) : view === 'quotations' ? (
        <QuotationsList
          onOpenQuote={setSelectedOrderId}
          onNewQuote={() => setIsWizardOpen(true)}
        />
      ) : (
        <SettingsPage />
      )}

      <AIQuoteWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      <RoleManagerModal
        isOpen={isRoleManagerOpen}
        onClose={() => setIsRoleManagerOpen(false)}
      />

      <Toaster position="bottom-right" theme="light" richColors />
    </AppShell>
  );
}

export default App;
