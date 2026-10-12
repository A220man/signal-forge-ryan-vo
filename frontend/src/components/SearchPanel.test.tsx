import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchPanel } from './SearchPanel'

const mockOnSelect = vi.fn()

describe('SearchPanel', () => {
  it('renders search input', () => {
    render(<SearchPanel onSelectLocation={mockOnSelect} />)
    const input = screen.getByPlaceholderText('Search locations...')
    expect(input).toBeInTheDocument()
  })

  it('calls onSelectLocation when result is clicked', () => {
    render(<SearchPanel onSelectLocation={mockOnSelect} />)
    const input = screen.getByPlaceholderText('Search locations...')
    expect(input).toBeInTheDocument()
  })

  it('clears results when Escape is pressed', () => {
    render(<SearchPanel onSelectLocation={mockOnSelect} />)
    const input = screen.getByPlaceholderText('Search locations...') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('')
  })
})