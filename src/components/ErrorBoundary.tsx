import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Optional: navigasi ke home saat tombol "Kembali ke Dashboard" ditekan */
  onReset?: () => void;
  /** Label yang muncul di error UI untuk membantu debug konteks */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — mencegat JavaScript Error dalam React tree anak.
 * Gunakan sebagai wrapper screen-level maupun komponen kritikal.
 *
 * Contoh:
 *   <ErrorBoundary name="AdminDashboard" onReset={() => onNavigate('ADMIN_DASHBOARD')}>
 *     <AdminDashboard ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log ke console — bisa diganti dengan Sentry / Firebase Crashlytics di masa depan
    console.error(
      `[ErrorBoundary] Crash di "${this.props.name ?? 'unknown'}"`,
      error,
      info.componentStack
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, name } = { error: this.state.error, name: this.props.name };

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] px-8 py-16 text-center min-h-screen">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Judul */}
        <h1 className="text-xl font-extrabold text-white mb-2">Terjadi Kesalahan</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          Halaman ini mengalami error dan tidak dapat ditampilkan.
        </p>

        {/* Context name */}
        {name && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full mb-4">
            {name}
          </span>
        )}

        {/* Error message (hanya di development) */}
        {import.meta.env.DEV && error && (
          <div className="w-full max-w-sm bg-[#151b2b] border border-red-500/20 rounded-2xl p-4 mb-6 text-left overflow-auto max-h-32">
            <p className="text-[10px] font-mono text-red-300 break-all leading-relaxed">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Coba Lagi
          </button>
          {this.props.onReset && (
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-5 py-3 bg-[#151b2b] border border-gray-700 hover:border-gray-600 text-gray-300 text-sm font-bold rounded-2xl transition-all active:scale-95"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
          )}
        </div>

        <p className="text-[10px] text-gray-600 mt-8 font-medium">
          KOMSOS St. Paulus Juanda • Error Boundary
        </p>
      </div>
    );
  }
}
