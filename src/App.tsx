
import { useEffect } from 'react';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { DevLoginModal } from './components/modals/DevLoginModal';


function App() {

  useEffect(() => {
    // Force dark mode logic or theme logic if needed, currently handling via Tailwind classes
    // The previous app had a toggle, but for Premium Industrial we might stick to light/zinc-50 default 
    // or respect system pref. For now, let's keep it clean.
    document.documentElement.classList.remove('dark'); // Default to light industrial
    // Or if we want dark mode support:
    // if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    //   document.documentElement.classList.add('dark');
    // }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <KanbanBoard />
      <DevLoginModal />
    </div>
  );
}

export default App;
