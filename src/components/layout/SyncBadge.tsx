import { useEffect } from 'react';
import { useStore, type SyncStatus } from '../../store/useStore';
import { cn } from '../../lib/utils';

const LABELS: Record<SyncStatus, string> = {
  connecting: 'Conectando…',
  live: 'Sincronizado',
  offline: 'Sin conexión — cambios pendientes',
  error: 'Error de sincronización',
};

const DOT_CLASSES: Record<SyncStatus, string> = {
  connecting: 'bg-zinc-300',
  live: 'bg-emerald-500',
  offline: 'bg-amber-500',
  error: 'bg-rose-500',
};

// Small status pill shown in the app shell header. Combines the sync listener
// status with navigator.onLine so a lost network connection is reflected even
// before Firestore notices.
export function SyncBadge() {
  const syncStatus = useStore((s) => s.syncStatus);
  const hydrated = useStore((s) => s.hasHydratedFromFirestore);
  const setSyncStatus = useStore((s) => s.setSyncStatus);

  useEffect(() => {
    const onOnline = () => {
      // Optimistically flip to live; the listener will correct us if writes fail.
      if (useStore.getState().hasHydratedFromFirestore) {
        setSyncStatus('live');
      }
    };
    const onOffline = () => setSyncStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (!navigator.onLine) setSyncStatus('offline');
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setSyncStatus]);

  // Before the first snapshot lands, show "connecting" (not "live"), so users
  // don't think stale local-cache data is the current server state.
  const effective: SyncStatus = hydrated ? syncStatus : 'connecting';

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200"
      title={LABELS[effective]}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          DOT_CLASSES[effective],
          effective === 'connecting' && 'animate-pulse',
        )}
      />
      <span className="hidden md:inline text-[11px] font-medium text-zinc-600">
        {LABELS[effective]}
      </span>
    </div>
  );
}
