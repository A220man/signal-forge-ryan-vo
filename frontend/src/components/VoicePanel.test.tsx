import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoicePanel } from './VoicePanel'
import { voiceService } from '@/services/voice'
import type { VoiceCommandResponse } from '@/types'

// Mock the voice service
vi.mock('@/services/voice', () => ({
  voiceService: {
    getProviders: vi.fn(),
    sendCommand: vi.fn(),
  },
}))

describe('VoicePanel', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(voiceService.getProviders).mockResolvedValue([
      { provider: 'mock', available: true, model: 'mock' },
      { provider: 'openai', available: false, model: 'gpt-4o-mini', error: 'API key not configured' },
      { provider: 'gemini', available: false, model: 'gemini-1.5-flash', error: 'API key not configured' },
    ])
    vi.mocked(voiceService.sendCommand).mockResolvedValue({
      success: true,
      text: 'Mock response',
      action: 'fly_to',
      action_params: { location: 'London' },
      provider: 'mock',
    })
  })

  it('renders voice panel with header', () => {
    render(<VoicePanel onAction={mockOnAction} />)

    expect(screen.getByText('Voice Assistant')).toBeInTheDocument()
    expect(screen.getByLabelText('Voice command input')).toBeInTheDocument()
  })

  it('shows provider selector with mock provider', async () => {
    render(<VoicePanel onAction={mockOnAction} />)

    // Wait for providers to load
    await waitFor(() => {
      expect(screen.getByText('Mock (Demo)')).toBeInTheDocument()
    })
  })

  it('sends command and displays response', async () => {
    render(<VoicePanel onAction={mockOnAction} />)

    // Wait for providers to load
    await waitFor(() => {
      expect(screen.getByText('Mock (Demo)')).toBeInTheDocument()
    })

    // Type a command
    const input = screen.getByLabelText('Voice command input')
    fireEvent.change(input, { target: { value: 'fly to London' } })

    // Click send button
    const sendButton = screen.getByLabelText('Send command')
    fireEvent.click(sendButton)

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Mock response')).toBeInTheDocument()
    })

    // Verify onAction was called with the action
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('fly_to', { location: 'London' })
    })
  })

  it('shows error when sendCommand fails', async () => {
    vi.mocked(voiceService.sendCommand).mockRejectedValueOnce(new Error('Network error'))

    render(<VoicePanel onAction={mockOnAction} />)

    await waitFor(() => {
      expect(screen.getByText('Mock (Demo)')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('Voice command input')
    fireEvent.change(input, { target: { value: 'fly to London' } })

    const sendButton = screen.getByLabelText('Send command')
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })
  })

  it('disables send button when input is empty', async () => {
    render(<VoicePanel onAction={mockOnAction} />)

    await waitFor(() => {
      expect(screen.getByText('Mock (Demo)')).toBeInTheDocument()
    })

    const sendButton = screen.getByLabelText('Send command')
    expect(sendButton).toBeDisabled()
  })

  it('disables input and buttons while loading', async () => {
    let resolveCommand: (value: VoiceCommandResponse) => void
    const commandPromise = new Promise<VoiceCommandResponse>(resolve => {
      resolveCommand = resolve
    })
    vi.mocked(voiceService.sendCommand).mockReturnValue(commandPromise as Promise<VoiceCommandResponse>)
    render(<VoicePanel onAction={mockOnAction} />)

    await waitFor(() => {
      expect(screen.getByText('Mock (Demo)')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('Voice command input')
    fireEvent.change(input, { target: { value: 'fly to London' } })

    const sendButton = screen.getByLabelText('Send command')
    fireEvent.click(sendButton)

    // While loading, input and send button should be disabled
    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()

    // Resolve the command
    resolveCommand!({
      success: true,
      text: 'Done',
      provider: 'mock',
    })

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })
  })
})