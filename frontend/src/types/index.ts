export interface GeocodeResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  class: string
  type: string
  importance: number
  icon?: string
  address?: Record<string, string>
  boundingbox?: string[]
}

export interface GeocodeResponse {
  results: GeocodeResult[]
  query: string
  timestamp: string
  cached: boolean
}

export interface CameraState {
  lat: number
  lng: number
  altitude: number
  heading: number
  pitch: number
}

export interface SavedLocation {
  id: string
  name: string
  camera: CameraState
  createdAt: string
}

export interface ApiError {
  error: string
  detail?: string
  timestamp: string
}