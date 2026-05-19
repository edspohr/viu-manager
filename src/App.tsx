
import { useEffect, useState } from 'react';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ClientPortalView } from './components/portal/ClientPortalView';
import { ApprovalPage } from './components/portal/ApprovalPage';
import { DevLoginModal } from './components/modals/DevLoginModal';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';

function App() {
  const { currentUser } = useStore();
  const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    // Check for ?order=ID deep-link — render ApprovalPage standalone
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (orderId) setApprovalOrderId(orderId);
  }, []);

  // Standalone approval page — shown for any role when ?order=ID is present
  if (approvalOrderId) {
    return (
      <>
        <ApprovalPage orderId={approvalOrderId} />
        <Toaster position="bottom-right" theme="light" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {currentUser.role === 'client' ? <ClientPortalView /> : <KanbanBoard />}
      <DevLoginModal />
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}

export default App;
