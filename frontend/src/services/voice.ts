/** Voice service for frontend API communication. */

import type { VoiceCommandRequest, VoiceCommandResponse, VoiceProviderStatus, ProviderConfigRequest, ProviderConfigResponse } from '../types'

const API_BASE = '/api'

class VoiceService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
        detail: response.statusText,
        timestamp: new Date().toISOString(),
      }))
      throw new Error(error.detail || error.error)
    }

    return response.json()
  }

  async sendCommand(request: VoiceCommandRequest): Promise<VoiceCommandResponse> {
    return this.request<VoiceCommandResponse>('/voice/command', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getProviders(): Promise<VoiceProviderStatus[]> {
    return this.request<VoiceProviderStatus[]>('/voice/providers')
  }

  async getProvider(providerName: string): Promise<VoiceProviderStatus> {
    return this.request<VoiceProviderStatus>(`/voice/providers/${providerName}`)
  }

  async configureProvider(request: ProviderConfigRequest): Promise<ProviderConfigResponse> {
    return this.request<ProviderConfigResponse>('/voice/providers/configure', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async setDefaultProvider(providerName: string): Promise<ProviderConfigResponse> {
    return this.request<ProviderConfigResponse>(`/voice/providers/${providerName}/default`, {
      method: 'POST',
    })
  }
}

export const voiceService = new VoiceService()