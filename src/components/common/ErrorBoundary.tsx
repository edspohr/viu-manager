import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors anywhere below it and shows a recovery screen instead
 * of a white page. Persisted state in localStorage is left intact so the user
 * can reload and continue.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-zinc-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900">Algo salió mal</h1>
              <p className="text-xs text-zinc-500">Tus datos guardados no se perdieron</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 mb-5">
            Ocurrió un error inesperado. Podés intentar volver atrás o recargar la página.
            Si el problema persiste, contactá a soporte.
          </p>

          {this.state.error && (
            <details className="mb-5">
              <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                Detalle técnico
              </summary>
              <pre className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] text-zinc-700 overflow-auto max-h-40 font-mono whitespace-pre-wrap break-words">
                {this.state.error.message}
                {this.state.error.stack ? '\n\n' + this.state.error.stack.slice(0, 1000) : ''}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <RefreshCw size={14} />
              Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
