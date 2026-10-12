import type { GeocodeResponse, ApiError } from '../types'

const API_BASE = '/api'

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Request failed',
        detail: response.statusText,
        timestamp: new Date().toISOString(),
      }))
      throw new Error(error.detail || error.error)
    }

    return response.json()
  }

  async geocode(query: string): Promise<GeocodeResponse> {
    const encodedQuery = encodeURIComponent(query)
    return this.request<GeocodeResponse>(`/geocode?q=${encodedQuery}`)
  }

  async health(): Promise<{ status: string; version: string; environment: string }> {
    return this.request('/health')
  }
}

export const api = new ApiClient()