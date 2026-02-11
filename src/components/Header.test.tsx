import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from './Header';

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText('paymsg playground')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Header />);
    expect(screen.getByText('ISO 20022 & SWIFT MT Message Tools')).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });
});
