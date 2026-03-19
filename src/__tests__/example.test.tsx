import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HomePage from '@/app/page'

vi.mock('@/components/live-status', () => ({
  default: () => (
    <div data-testid="live-status-mock">
      <div>System Status</div>
    </div>
  ),
}))

vi.mock('@/components/create-collection-form', () => ({
  default: () => <div data-testid="create-collection-form-mock">Form</div>,
}))

describe('HomePage', () => {
  it('renders hero title', () => {
    render(<HomePage />)
    expect(screen.getByText('Calendar Aggregator')).toBeInTheDocument()
  })

  it('renders tagline', () => {
    render(<HomePage />)
    expect(
      screen.getByText(/Combine multiple iCal feeds into one URL/i)
    ).toBeInTheDocument()
  })

  it('renders how it works steps', () => {
    render(<HomePage />)
    expect(screen.getByText('Paste your iCal URLs')).toBeInTheDocument()
    expect(screen.getByText('Name your collection')).toBeInTheDocument()
    expect(
      screen.getByText('Subscribe in your calendar app')
    ).toBeInTheDocument()
  })

  it('renders the form and status components', () => {
    render(<HomePage />)
    expect(
      screen.getByTestId('create-collection-form-mock')
    ).toBeInTheDocument()
    expect(screen.getByTestId('live-status-mock')).toBeInTheDocument()
  })
})
