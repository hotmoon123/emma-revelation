import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  label?: string;
}
interface State {
  failed: boolean;
}

/** Keeps one broken section from blanking the whole site. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Details stay in the console; users only see a safe message (SECURITY.md §7).
    console.error('UI error:', error.message, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-center">
        <AlertTriangle className="w-8 h-8 text-[#2563EB] mx-auto" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-serif font-bold text-[#0F172A]">
          {this.props.label ?? 'This section'} could not be displayed
        </h2>
        <p className="mt-2 text-base text-[#64748B]">Your saved content is safe. Reload to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reload
        </button>
      </div>
    );
  }
}
