import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AdminDashboard } from './views/AdminDashboard';
import { ClientPortal } from './views/ClientPortal';
import { OperationsView } from './views/OperationsView';
import { useStore } from './store/useStore';

function App() {
  const { currentUser } = useStore();

  useEffect(() => {
    const isDark = currentUser === 'operations';
    document.documentElement.classList.toggle('dark', isDark);
  }, [currentUser]);

  const renderView = () => {
    switch (currentUser) {
      case 'client':
        return <ClientPortal />;
      case 'operations':
        return <OperationsView />;
      case 'admin':
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AppLayout>
      {renderView()}
    </AppLayout>
  );
}

export default App;
