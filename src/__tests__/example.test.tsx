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
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/Many calendars/i)
    expect(heading).toHaveTextContent(/One URL/i)
  })

  it('renders tagline', () => {
    render(<HomePage />)
    expect(
      screen.getByText(/Point this at every .ics feed you care about/i)
    ).toBeInTheDocument()
  })

  it('renders how it works steps', () => {
    render(<HomePage />)
    expect(screen.getByText('Paste your .ics links')).toBeInTheDocument()
    expect(screen.getByText('Name the collection')).toBeInTheDocument()
    expect(screen.getByText('Subscribe once')).toBeInTheDocument()
  })

  it('renders the form and status components', () => {
    render(<HomePage />)
    expect(
      screen.getByTestId('create-collection-form-mock')
    ).toBeInTheDocument()
    expect(screen.getByTestId('live-status-mock')).toBeInTheDocument()
  })
})
