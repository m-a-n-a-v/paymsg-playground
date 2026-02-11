import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Toolbar from './Toolbar';

describe('Toolbar', () => {
  const mockSamples = [
    { id: 'mt103-sepa', label: 'MT103 SEPA EUR', description: 'Simple SEPA transfer' },
    { id: 'pacs008', label: 'pacs.008', description: 'Customer credit transfer' },
  ];

  it('renders all action buttons', () => {
    render(<Toolbar />);
    expect(screen.getByText('Parse')).toBeInTheDocument();
    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('calls onParse when Parse button is clicked', () => {
    const onParse = vi.fn();
    render(<Toolbar onParse={onParse} />);
    fireEvent.click(screen.getByText('Parse'));
    expect(onParse).toHaveBeenCalledOnce();
  });

  it('calls onValidate when Validate button is clicked', () => {
    const onValidate = vi.fn();
    render(<Toolbar onValidate={onValidate} />);
    fireEvent.click(screen.getByText('Validate'));
    expect(onValidate).toHaveBeenCalledOnce();
  });

  it('calls onTranslate when Translate button is clicked', () => {
    const onTranslate = vi.fn();
    render(<Toolbar onTranslate={onTranslate} />);
    fireEvent.click(screen.getByText('Translate'));
    expect(onTranslate).toHaveBeenCalledOnce();
  });

  it('calls onFormat when Format button is clicked', () => {
    const onFormat = vi.fn();
    render(<Toolbar onFormat={onFormat} />);
    fireEvent.click(screen.getByText('Format'));
    expect(onFormat).toHaveBeenCalledOnce();
  });

  it('calls onClear when Clear button is clicked', () => {
    const onClear = vi.fn();
    render(<Toolbar onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('renders sample selector with samples', () => {
    render(<Toolbar samples={mockSamples} />);
    expect(screen.getByText('Load sample message...')).toBeInTheDocument();
    expect(screen.getByText('MT103 SEPA EUR')).toBeInTheDocument();
    expect(screen.getByText('pacs.008')).toBeInTheDocument();
  });

  it('calls onSampleSelect when a sample is selected', () => {
    const onSampleSelect = vi.fn();
    render(<Toolbar samples={mockSamples} onSampleSelect={onSampleSelect} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mt103-sepa' } });

    expect(onSampleSelect).toHaveBeenCalledWith('mt103-sepa');
  });

  it('renders with selected sample', () => {
    render(<Toolbar samples={mockSamples} selectedSample="mt103-sepa" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('mt103-sepa');
  });

  it('renders without optional handlers', () => {
    render(<Toolbar />);
    expect(screen.getByText('Parse')).toBeInTheDocument();
  });

  it('has proper button titles for keyboard shortcuts', () => {
    render(<Toolbar />);
    expect(screen.getByTitle('Parse message (Ctrl+Enter)')).toBeInTheDocument();
    expect(screen.getByTitle('Validate message (Ctrl+Shift+V)')).toBeInTheDocument();
    expect(screen.getByTitle('Translate message (Ctrl+Shift+T)')).toBeInTheDocument();
    expect(screen.getByTitle('Format message (Ctrl+Shift+F)')).toBeInTheDocument();
    expect(screen.getByTitle('Clear all (Ctrl+K)')).toBeInTheDocument();
  });
});
