import { useRef, useState, useCallback, useEffect } from 'react'
import { GlobeComponent, type GlobeRef } from '@/components/Globe'
import { SearchPanel } from '@/components/SearchPanel'
import { Sidebar } from '@/components/Sidebar'
import { HUD } from '@/components/HUD'
import { CameraPanel } from '@/components/CameraPanel'
import { VoicePanel } from '@/components/VoicePanel'
import { ToastContainer, useToasts } from '@/components/Toast'
import { api } from '@/services/api'
import type { GeocodeResult, CameraState, SavedLocation, CameraFeed, CameraFeedResponse, VoiceCommandRequest } from '@/types'
import '@/styles/globals.css'

const STORAGE_KEY = 'signal-forge-saved-locations'

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function loadSavedLocations(): SavedLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveLocations(locations: SavedLocation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations))
  } catch {
    // Ignore write errors
  }
}

export function App() {
  const globeRef = useRef<GlobeRef>(null)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => loadSavedLocations())
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null)
  const [currentCamera, setCurrentCamera] = useState<CameraState | null>(null)
  const [cameras, setCameras] = useState<CameraFeed[]>([])
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null)
  const [camerasLoading, setCamerasLoading] = useState(false)
  const [camerasError, setCamerasError] = useState<string | null>(null)
  const { toasts, dismissToast, success, error: showError, info } = useToasts()

  useEffect(() => {
    saveLocations(savedLocations)
  }, [savedLocations])

  const updateCamera = useCallback(() => {
    if (globeRef.current) {
      const camera = globeRef.current.getCameraState()
      if (camera) {
        setCurrentCamera(camera)
      }
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(updateCamera, 500)
    return () => clearInterval(interval)
  }, [updateCamera])

  const fetchCameras = useCallback(async () => {
    setCamerasLoading(true)
    setCamerasError(null)
    try {
      // Get current camera bounds to filter cameras
      let bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | undefined
      if (currentCamera) {
        // Approximate viewport bounds based on altitude
        const altitude = currentCamera.altitude
        const latDelta = Math.max(0.5, altitude * 2)
        const lngDelta = Math.max(0.5, altitude * 2)
        bbox = {
          minLat: currentCamera.lat - latDelta,
          maxLat: currentCamera.lat + latDelta,
          minLng: currentCamera.lng - lngDelta,
          maxLng: currentCamera.lng + lngDelta,
        }
      }

      const response: CameraFeedResponse = await api.getCameras(bbox)
      setCameras(response.cameras)

      // Add camera markers to globe
      if (globeRef.current) {
        globeRef.current.clearCameraMarkers()
        response.cameras.forEach((cam) => {
          globeRef.current?.addCameraMarker(cam)
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load cameras'
      setCamerasError(msg)
      showError(msg)
    } finally {
      setCamerasLoading(false)
    }
  }, [currentCamera, showError])

  // Initial camera fetch
  useEffect(() => {
    fetchCameras()
  }, [fetchCameras])

  // Refetch cameras when camera position changes significantly
  useEffect(() => {
    if (!currentCamera) return
    const timer = setTimeout(() => {
      fetchCameras()
    }, 2000)
    return () => clearTimeout(timer)
  }, [currentCamera?.lat, currentCamera?.lng, currentCamera?.altitude, fetchCameras])

  const handleSelectLocation = useCallback((result: GeocodeResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    if (globeRef.current) {
      globeRef.current.flyTo(lat, lng, 2.5, 2000)
      globeRef.current.clearMarkers()
      globeRef.current.addMarker(lat, lng)
      setActiveLocationId(null)
    }
  }, [])

  const handleGoToSavedLocation = useCallback((location: SavedLocation) => {
    if (globeRef.current) {
      globeRef.current.goToLocation(location)
      globeRef.current.clearMarkers()
      globeRef.current.addMarker(location.camera.lat, location.camera.lng)
      setActiveLocationId(location.id)
    }
  }, [])

  const handleSaveLocation = useCallback((name: string, camera: CameraState) => {
    const newLocation: SavedLocation = {
      id: generateId(),
      name,
      camera,
      createdAt: new Date().toISOString(),
    }
    setSavedLocations((prev) => [...prev, newLocation])
    setActiveLocationId(newLocation.id)
    success(`Saved "${name}"`)
  }, [success])

  const handleRenameLocation = useCallback((id: string, name: string) => {
    setSavedLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, name } : loc))
    )
    success(`Renamed to "${name}"`)
  }, [success])

  const handleDeleteLocation = useCallback((id: string) => {
    const location = savedLocations.find((l) => l.id === id)
    setSavedLocations((prev) => prev.filter((l) => l.id !== id))
    if (activeLocationId === id) {
      setActiveLocationId(null)
    }
    if (location) {
      showError(`Deleted "${location.name}"`)
    }
  }, [savedLocations, activeLocationId, showError])

  const handleSelectCamera = useCallback((camera: CameraFeed | null) => {
    setSelectedCamera(camera)
    if (globeRef.current) {
      globeRef.current.setSelectedCamera(camera)
    }
  }, [])

  const handleFlyToCamera = useCallback((camera: CameraFeed) => {
    if (globeRef.current) {
      globeRef.current.flyTo(camera.lat, camera.lng, 1.5, 1500)
    }
    info(`Flying to ${camera.name}`)
  }, [info])

  const handleVoiceAction = useCallback((action: string, params: Record<string, unknown>) => {
    switch (action) {
      case 'fly_to': {
        const location = params.location as string
        if (location && globeRef.current) {
          // Use the geocoding API to find the location first
          api.geocode(location).then(response => {
            if (response.results.length > 0) {
              const result = response.results[0]
              const lat = parseFloat(result.lat)
              const lng = parseFloat(result.lon)
              globeRef.current?.flyTo(lat, lng, 2.5, 2000)
              globeRef.current?.clearMarkers()
              globeRef.current?.addMarker(lat, lng)
              info(`Flying to ${result.display_name}`)
            }
          }).catch(() => {
            showError(`Could not find location: ${location}`)
          })
        }
        break
      }
      case 'search': {
        const query = params.query as string
        if (query) {
          // The search panel handles this, but we can trigger it programmatically
          // For now, just geocode and fly
          api.geocode(query).then(response => {
            if (response.results.length > 0) {
              const result = response.results[0]
              const lat = parseFloat(result.lat)
              const lng = parseFloat(result.lon)
              globeRef.current?.flyTo(lat, lng, 2.5, 2000)
              globeRef.current?.clearMarkers()
              globeRef.current?.addMarker(lat, lng)
              info(`Found: ${result.display_name}`)
            } else {
              showError(`No results for: ${query}`)
            }
          }).catch(() => {
            showError(`Search failed for: ${query}`)
          })
        }
        break
      }
      case 'save_location': {
        if (currentCamera) {
          const name = (params.name as string) || `Voice saved ${new Date().toLocaleTimeString()}`
          handleSaveLocation(name, currentCamera)
        } else {
          showError('No current camera position to save')
        }
        break
      }
      case 'show_cameras': {
        // Trigger camera fetch for current position
        fetchCameras()
        info('Loading nearby cameras')
        break
      }
    }
  }, [currentCamera, fetchCameras, handleSaveLocation, info, showError])
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <GlobeComponent ref={globeRef} />
      <SearchPanel onSelectLocation={handleSelectLocation} />
      <Sidebar
        savedLocations={savedLocations}
        activeLocationId={activeLocationId}
        onSelectLocation={handleGoToSavedLocation}
        onSaveLocation={handleSaveLocation}
        onRenameLocation={handleRenameLocation}
        onDeleteLocation={handleDeleteLocation}
        currentCamera={currentCamera}
      />
      <CameraPanel
        cameras={cameras}
        selectedCamera={selectedCamera}
        onSelectCamera={handleSelectCamera}
        onFlyToCamera={handleFlyToCamera}
        currentCamera={currentCamera}
      />
      <VoicePanel onAction={handleVoiceAction} />
      <HUD camera={currentCamera} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}