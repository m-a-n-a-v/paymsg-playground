import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBar from './StatusBar';
import { MessageFormat, MessageType } from '../engine/types';

describe('StatusBar', () => {
  it('renders with no message detected', () => {
    render(<StatusBar />);
    expect(screen.getByText('No message')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('displays MT format correctly', () => {
    render(<StatusBar messageFormat={MessageFormat.MT} />);
    expect(screen.getByText('SWIFT MT')).toBeInTheDocument();
  });

  it('displays MX format correctly', () => {
    render(<StatusBar messageFormat={MessageFormat.MX} />);
    expect(screen.getByText('ISO 20022 MX')).toBeInTheDocument();
  });

  it('displays MT103 type correctly', () => {
    render(
      <StatusBar messageFormat={MessageFormat.MT} messageType={MessageType.MT103} />
    );
    expect(screen.getByText('MT103 - Customer Credit Transfer')).toBeInTheDocument();
  });

  it('displays pacs.008 type correctly', () => {
    render(
      <StatusBar messageFormat={MessageFormat.MX} messageType={MessageType.PACS008} />
    );
    expect(screen.getByText('pacs.008 - Customer Credit Transfer')).toBeInTheDocument();
  });

  it('displays all MT message types', () => {
    const { rerender } = render(
      <StatusBar messageFormat={MessageFormat.MT} messageType={MessageType.MT103} />
    );
    expect(screen.getByText('MT103 - Customer Credit Transfer')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MT} messageType={MessageType.MT202} />);
    expect(screen.getByText('MT202 - FI Credit Transfer')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MT} messageType={MessageType.MT940} />);
    expect(screen.getByText('MT940 - Customer Statement')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MT} messageType={MessageType.MT942} />);
    expect(screen.getByText('MT942 - Interim Transaction Report')).toBeInTheDocument();
  });

  it('displays all MX message types', () => {
    const { rerender } = render(
      <StatusBar messageFormat={MessageFormat.MX} messageType={MessageType.PACS008} />
    );
    expect(screen.getByText('pacs.008 - Customer Credit Transfer')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MX} messageType={MessageType.PACS009} />);
    expect(screen.getByText('pacs.009 - FI Credit Transfer')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MX} messageType={MessageType.CAMT053} />);
    expect(screen.getByText('camt.053 - Bank-to-Customer Statement')).toBeInTheDocument();

    rerender(<StatusBar messageFormat={MessageFormat.MX} messageType={MessageType.CAMT052} />);
    expect(screen.getByText('camt.052 - Interim Report')).toBeInTheDocument();
  });

  it('handles unknown format', () => {
    render(<StatusBar messageFormat={MessageFormat.UNKNOWN} />);
    expect(screen.getByText('No message')).toBeInTheDocument();
  });
});
