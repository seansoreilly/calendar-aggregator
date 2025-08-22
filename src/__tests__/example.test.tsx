import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HomePage from '@/app/page'

// Mock the LiveStatus component to avoid API calls in tests
vi.mock('@/components/live-status', () => ({
  default: () => (
    <div data-testid="live-status-mock">
      <div>System Status</div>
      <div>All Systems Operational</div>
    </div>
  ),
}))

describe('HomePage', () => {
  it('renders calendar aggregator title', () => {
    render(<HomePage />)

    expect(screen.getByText('Calendar Aggregator')).toBeInTheDocument()
  })

  it('displays main sections', () => {
    render(<HomePage />)

    expect(screen.getByText('API Endpoints')).toBeInTheDocument()
    expect(screen.getByText('Live Status')).toBeInTheDocument()
    expect(screen.getByText('Quick Start')).toBeInTheDocument()
  })

  it('shows api endpoint links', () => {
    render(<HomePage />)

    expect(screen.getAllByText('/api/collections')).toHaveLength(2) // Appears in API section and Quick Start
    expect(screen.getAllByText('/api/calendar/[guid]')).toHaveLength(2) // Appears in API section and Quick Start
    expect(screen.getByText('/api/health')).toBeInTheDocument()
  })

  it('has functioning test api button', () => {
    render(<HomePage />)

    expect(screen.getByRole('link', { name: 'Test API' })).toBeInTheDocument()
  })
})
