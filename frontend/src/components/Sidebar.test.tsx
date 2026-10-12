import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import type { SavedLocation, CameraState } from '../types'

const mockCamera: CameraState = {
  lat: 51.5074,
  lng: -0.1278,
  altitude: 2.5,
  heading: 0,
  pitch: 0,
}

const mockLocations: SavedLocation[] = [
  {
    id: 'loc-1',
    name: 'London',
    camera: mockCamera,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    name: 'New York',
    camera: { ...mockCamera, lat: 40.7128, lng: -74.006 },
    createdAt: '2024-01-02T00:00:00Z',
  },
]

const mockProps = {
  savedLocations: mockLocations,
  activeLocationId: 'loc-1',
  onSelectLocation: vi.fn(),
  onSaveLocation: vi.fn(),
  onRenameLocation: vi.fn(),
  onDeleteLocation: vi.fn(),
  currentCamera: mockCamera,
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders saved locations', () => {
    render(<Sidebar {...mockProps} />)
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()
  })

  it('shows save location button when camera is available', () => {
    render(<Sidebar {...mockProps} />)
    const saveBtn = screen.getByRole('button', { name: /save current location/i })
    expect(saveBtn).toBeInTheDocument()
    expect(saveBtn).not.toBeDisabled()
  })

  it('disables save location button when no camera', () => {
    render(<Sidebar {...mockProps} currentCamera={null} />)
    const saveBtn = screen.getByRole('button', { name: /save current location/i })
    expect(saveBtn).toBeDisabled()
  })

  it('calls onSelectLocation when location is clicked', () => {
    render(<Sidebar {...mockProps} />)
    fireEvent.click(screen.getByText('New York'))
    expect(mockProps.onSelectLocation).toHaveBeenCalledWith(mockLocations[1])
  })

  it('calls onDeleteLocation when delete button is clicked', () => {
    render(<Sidebar {...mockProps} />)
    const deleteBtn = screen.getByRole('button', { name: /delete london/i })
    fireEvent.click(deleteBtn)
    expect(mockProps.onDeleteLocation).toHaveBeenCalledWith('loc-1')
  })

  it('shows empty state when no saved locations', () => {
    render(<Sidebar {...mockProps} savedLocations={[]} />)
    expect(screen.getByText('No saved locations yet')).toBeInTheDocument()
  })
})