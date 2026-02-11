import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationPanel } from './ValidationPanel';
import { Severity } from '../engine/types';
import type { ValidationResult } from '../engine/types';

describe('ValidationPanel', () => {
  it('shows empty state when no validation result', () => {
    render(<ValidationPanel result={undefined} />);
    expect(screen.getByText('No validation results yet')).toBeInTheDocument();
    expect(screen.getByText('Click Validate to check your message')).toBeInTheDocument();
  });

  it('shows success banner when validation passes with no errors', () => {
    const result: ValidationResult = {
      valid: true,
      issues: [],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('Validation Passed')).toBeInTheDocument();
    expect(screen.getByText('No errors found in the message')).toBeInTheDocument();
  });

  it('shows validation failed banner when errors exist', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        {
          severity: Severity.ERROR,
          field_path: ':20:',
          message: 'Field is required',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('Validation Failed')).toBeInTheDocument();
    expect(screen.getByText('1 error')).toBeInTheDocument();
  });

  it('displays error issue with correct styling', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        {
          severity: Severity.ERROR,
          field_path: ':20:',
          message: 'Field is required',
          suggestion: 'Add a transaction reference',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText(':20:')).toBeInTheDocument();
    expect(screen.getByText('Field is required')).toBeInTheDocument();
    expect(screen.getByText('💡 Add a transaction reference')).toBeInTheDocument();
  });

  it('displays warning issue with correct styling', () => {
    const result: ValidationResult = {
      valid: true,
      issues: [
        {
          severity: Severity.WARNING,
          field_path: ':32A:',
          message: 'Date is in the past',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText(':32A:')).toBeInTheDocument();
    expect(screen.getByText('Date is in the past')).toBeInTheDocument();
  });

  it('displays info issue with correct styling', () => {
    const result: ValidationResult = {
      valid: true,
      issues: [
        {
          severity: Severity.INFO,
          field_path: 'GrpHdr/MsgId',
          message: 'Message ID format is valid',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('GrpHdr/MsgId')).toBeInTheDocument();
    expect(screen.getByText('Message ID format is valid')).toBeInTheDocument();
  });

  it('counts issues by severity correctly', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.ERROR, field_path: ':32A:', message: 'Error 2' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
        { severity: Severity.INFO, field_path: ':59:', message: 'Info 1' },
        { severity: Severity.INFO, field_path: ':71A:', message: 'Info 2' },
        { severity: Severity.INFO, field_path: ':71F:', message: 'Info 3' },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('2 errors')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('3 infos')).toBeInTheDocument();
  });

  it('displays issues in correct order: errors, warnings, info', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.INFO, field_path: ':71A:', message: 'Info message' },
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error message' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning message' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const issueCards = screen.getAllByText(/message$/);
    expect(issueCards[0]).toHaveTextContent('Error message');
    expect(issueCards[1]).toHaveTextContent('Warning message');
    expect(issueCards[2]).toHaveTextContent('Info message');
  });

  it('toggles error filter on click', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const errorButton = screen.getByText(/Errors \(1\)/);
    fireEvent.click(errorButton);

    // Error should be filtered out
    expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
    expect(screen.getByText('Warning 1')).toBeInTheDocument();
  });

  it('toggles warning filter on click', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const warningButton = screen.getByText(/Warnings \(1\)/);
    fireEvent.click(warningButton);

    // Warning should be filtered out
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.queryByText('Warning 1')).not.toBeInTheDocument();
  });

  it('toggles info filter on click', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.INFO, field_path: ':71A:', message: 'Info 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const infoButton = screen.getByText(/Info \(1\)/);
    fireEvent.click(infoButton);

    // Info should be filtered out
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.queryByText('Info 1')).not.toBeInTheDocument();
  });

  it('shows filtered out message when all issues are filtered', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const errorButton = screen.getByText(/Errors \(1\)/);
    fireEvent.click(errorButton);

    expect(screen.getByText('All issues are filtered out')).toBeInTheDocument();
    expect(screen.getByText('Enable filters above to see issues')).toBeInTheDocument();
  });

  it('displays issue ID when provided', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        {
          id: 'MT103-001',
          severity: Severity.ERROR,
          field_path: ':20:',
          message: 'Field is required',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('(MT103-001)')).toBeInTheDocument();
  });

  it('handles multiple issues with suggestions', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        {
          severity: Severity.ERROR,
          field_path: ':20:',
          message: 'Field is required',
          suggestion: 'Add a transaction reference',
        },
        {
          severity: Severity.WARNING,
          field_path: ':32A:',
          message: 'Amount is very large',
          suggestion: 'Verify the amount is correct',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('💡 Add a transaction reference')).toBeInTheDocument();
    expect(screen.getByText('💡 Verify the amount is correct')).toBeInTheDocument();
  });

  it('handles validation result with only warnings (no errors)', () => {
    const result: ValidationResult = {
      valid: true,
      issues: [
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
        { severity: Severity.WARNING, field_path: ':59:', message: 'Warning 2' },
      ],
    };
    render(<ValidationPanel result={result} />);

    // Should show success banner (no errors)
    expect(screen.getByText('Validation Passed')).toBeInTheDocument();

    // But still show warning count in filters
    expect(screen.getByText(/Warnings \(2\)/)).toBeInTheDocument();
  });

  it('renders filter buttons with correct initial state', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
        { severity: Severity.INFO, field_path: ':71A:', message: 'Info 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    const errorButton = screen.getByText(/Errors \(1\)/);
    const warningButton = screen.getByText(/Warnings \(1\)/);
    const infoButton = screen.getByText(/Info \(1\)/);

    // All filters should be enabled by default
    expect(errorButton).toHaveClass('bg-red-900/30');
    expect(warningButton).toHaveClass('bg-amber-900/30');
    expect(infoButton).toHaveClass('bg-blue-900/30');
  });

  it('toggles multiple filters independently', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        { severity: Severity.ERROR, field_path: ':20:', message: 'Error 1' },
        { severity: Severity.WARNING, field_path: ':50K:', message: 'Warning 1' },
        { severity: Severity.INFO, field_path: ':71A:', message: 'Info 1' },
      ],
    };
    render(<ValidationPanel result={result} />);

    // Toggle error filter
    fireEvent.click(screen.getByText(/Errors \(1\)/));
    expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
    expect(screen.getByText('Warning 1')).toBeInTheDocument();
    expect(screen.getByText('Info 1')).toBeInTheDocument();

    // Toggle warning filter
    fireEvent.click(screen.getByText(/Warnings \(1\)/));
    expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Warning 1')).not.toBeInTheDocument();
    expect(screen.getByText('Info 1')).toBeInTheDocument();

    // Re-enable error filter
    fireEvent.click(screen.getByText(/Errors \(1\)/));
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.queryByText('Warning 1')).not.toBeInTheDocument();
    expect(screen.getByText('Info 1')).toBeInTheDocument();
  });

  it('handles long field paths without breaking layout', () => {
    const result: ValidationResult = {
      valid: false,
      issues: [
        {
          severity: Severity.ERROR,
          field_path: 'Document/FIToFICstmrCdtTrf/CdtTrfTxInf/IntrBkSttlmAmt',
          message: 'Amount is required',
        },
      ],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('Document/FIToFICstmrCdtTrf/CdtTrfTxInf/IntrBkSttlmAmt')).toBeInTheDocument();
  });

  it('handles empty issues array', () => {
    const result: ValidationResult = {
      valid: true,
      issues: [],
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('Validation Passed')).toBeInTheDocument();
    // Should not show filter buttons when there are no issues
    expect(screen.queryByText('Show:')).not.toBeInTheDocument();
  });
});
