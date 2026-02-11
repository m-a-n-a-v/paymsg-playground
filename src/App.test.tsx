import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the paymsg playground heading', () => {
    render(<App />)
    expect(screen.getByText('paymsg playground')).toBeInTheDocument()
  })
})
