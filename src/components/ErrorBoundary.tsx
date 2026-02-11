import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-terminal-bg)] text-[var(--color-terminal-fg)] p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-red-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h1 className="text-xl font-semibold text-red-400">Something went wrong</h1>
            </div>

            <p className="text-zinc-300 mb-4">
              An unexpected error occurred in the application. This is likely a bug.
            </p>

            {this.state.error !== null && (
              <div className="bg-zinc-950 border border-zinc-800 rounded p-3 mb-4">
                <p className="text-xs font-mono text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors text-sm font-medium"
              >
                Try again
              </button>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors text-sm font-medium"
              >
                Reload page
              </button>
            </div>

            <p className="text-xs text-zinc-500 mt-4">
              If this problem persists, please report it at{' '}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                className="text-cyan-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Issues
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
