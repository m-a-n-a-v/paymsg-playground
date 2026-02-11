import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

describe('KeyboardShortcutsDialog', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<KeyboardShortcutsDialog isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when isOpen is true', () => {
    render(<KeyboardShortcutsDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays all keyboard shortcuts', () => {
    render(<KeyboardShortcutsDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Parse message')).toBeInTheDocument();
    expect(screen.getByText('Validate message')).toBeInTheDocument();
    expect(screen.getByText('Translate message')).toBeInTheDocument();
    expect(screen.getByText('Format message')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('displays shortcut keys in kbd elements', () => {
    render(<KeyboardShortcutsDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Ctrl/Cmd + Enter')).toBeInTheDocument();
    expect(screen.getByText('Ctrl/Cmd + Shift + V')).toBeInTheDocument();
    expect(screen.getByText('Ctrl/Cmd + Shift + T')).toBeInTheDocument();
    expect(screen.getByText('Ctrl/Cmd + Shift + F')).toBeInTheDocument();
    expect(screen.getByText('Ctrl/Cmd + K')).toBeInTheDocument();
    expect(screen.getByText('Ctrl/Cmd + /')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsDialog isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsDialog isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByTestId('dialog-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsDialog isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    render(<KeyboardShortcutsDialog isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-title');
  });

  it('displays Esc hint for closing', () => {
    render(<KeyboardShortcutsDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText(/close this dialog/i)).toBeInTheDocument();
  });
});
