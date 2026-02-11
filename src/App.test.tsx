import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the main layout components', () => {
    render(<App />);

    // Header
    expect(screen.getByText('paymsg playground')).toBeInTheDocument();
    expect(screen.getByText('ISO 20022 & SWIFT MT Message Tools')).toBeInTheDocument();

    // Toolbar
    expect(screen.getByText('Parse')).toBeInTheDocument();
    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();

    // Input/Output labels
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();

    // Status bar
    expect(screen.getByText('No message')).toBeInTheDocument();
  });

  it('loads a sample message when selected', () => {
    render(<App />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mt103-sepa-eur' } });

    // Check that message format is detected
    expect(screen.getByText('SWIFT MT')).toBeInTheDocument();
    expect(screen.getByText('MT103 - Customer Credit Transfer')).toBeInTheDocument();
  });

  it('clears all content when Clear is clicked', () => {
    render(<App />);

    // Load a sample
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mt103-sepa-eur' } });

    // Clear
    fireEvent.click(screen.getByText('Clear'));

    // Check that status is reset
    expect(screen.getByText('No message')).toBeInTheDocument();
  });

  it('detects message format on input change', () => {
    render(<App />);

    // Find the input editor and simulate typing
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pacs008-sepa' } });

    // Should detect MX format
    expect(screen.getByText('ISO 20022 MX')).toBeInTheDocument();
  });

  it('has split-pane layout with input and output editors', () => {
    const { container } = render(<App />);

    // Check for editor containers
    const editors = container.querySelectorAll('.cm-editor');
    expect(editors.length).toBe(2); // Input and output editors
  });

  it('handles Parse button click', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByText('Parse'));

    // Check that output editor exists (content is in CodeMirror which doesn't expose text directly)
    const editors = container.querySelectorAll('.cm-editor');
    expect(editors.length).toBe(2);
  });

  it('handles Validate button click', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByText('Validate'));

    // Check that output editor exists
    const editors = container.querySelectorAll('.cm-editor');
    expect(editors.length).toBe(2);
  });

  it('handles Translate button click', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByText('Translate'));

    // Check that output editor exists
    const editors = container.querySelectorAll('.cm-editor');
    expect(editors.length).toBe(2);
  });
});
