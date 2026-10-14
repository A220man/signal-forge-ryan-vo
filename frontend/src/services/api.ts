import type { GeocodeResponse, ApiError, CameraFeedResponse, CameraFeed } from '../types'

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

  async getCameras(bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number }): Promise<CameraFeedResponse> {
    const params = new URLSearchParams()
    if (bbox) {
      params.append('min_lat', bbox.minLat.toString())
      params.append('min_lng', bbox.minLng.toString())
      params.append('max_lat', bbox.maxLat.toString())
      params.append('max_lng', bbox.maxLng.toString())
    }
    const query = params.toString()
    return this.request<CameraFeedResponse>(`/cameras${query ? `?${query}` : ''}`)
  }

  getCameraImageUrl(cameraId: string): string {
    return `${API_BASE}/cameras/${cameraId}/proxy`
  }
}

export const api = new ApiClient()