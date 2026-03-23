
import { useEffect } from 'react';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ClientPortalView } from './components/portal/ClientPortalView';
import { DevLoginModal } from './components/modals/DevLoginModal';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';

function App() {
  const { currentUser } = useStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {currentUser.role === 'client' ? <ClientPortalView /> : <KanbanBoard />}
      <DevLoginModal />
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}

export default App;
