import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-cyan-400 mb-3" size={32} />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}
