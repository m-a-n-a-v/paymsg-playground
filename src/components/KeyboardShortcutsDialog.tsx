import { X } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'Ctrl/Cmd + Enter', description: 'Parse message' },
  { key: 'Ctrl/Cmd + Shift + V', description: 'Validate message' },
  { key: 'Ctrl/Cmd + Shift + T', description: 'Translate message' },
  { key: 'Ctrl/Cmd + Shift + F', description: 'Format message' },
  { key: 'Ctrl/Cmd + K', description: 'Clear all' },
  { key: 'Ctrl/Cmd + /', description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="dialog-backdrop"
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => {
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-zinc-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.key} className="flex items-center justify-between">
                <span className="text-zinc-300 text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-950/50">
          <p className="text-xs text-zinc-500">
            Press <kbd className="px-1 bg-zinc-800 border border-zinc-700 rounded">Esc</kbd> to
            close this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
