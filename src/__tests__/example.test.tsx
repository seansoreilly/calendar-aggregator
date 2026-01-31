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

// Mock the CreateCollectionForm component to avoid form complexity in tests
vi.mock('@/components/create-collection-form', () => ({
  default: () => <div data-testid="create-collection-form-mock">Form</div>,
}))

describe('HomePage', () => {
  it('renders hero title', () => {
    render(<HomePage />)

    expect(screen.getByText('Unify Your')).toBeInTheDocument()
    expect(screen.getByText('Digital Rhythm')).toBeInTheDocument()
  })

  it('displays feature badges', () => {
    render(<HomePage />)

    expect(screen.getByText('Zero-Knowledge Proxy')).toBeInTheDocument()
    expect(screen.getByText('Edge-Cached Sync')).toBeInTheDocument()
    expect(screen.getByText('iCal Compliant')).toBeInTheDocument()
  })

  it('shows aggregation protocol badge', () => {
    render(<HomePage />)

    expect(screen.getByText('Aggregation Protocol v2.0')).toBeInTheDocument()
  })
})
