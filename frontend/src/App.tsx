import { useRef, useState, useCallback, useEffect } from 'react'
import { GlobeComponent, type GlobeRef } from '@/components/Globe'
import { SearchPanel } from '@/components/SearchPanel'
import { Sidebar } from '@/components/Sidebar'
import { HUD } from '@/components/HUD'
import { ToastContainer, useToasts } from '@/components/Toast'
import type { GeocodeResult, CameraState, SavedLocation } from '@/types'
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
  const { toasts, dismissToast, success, error: showError } = useToasts()

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
      <HUD camera={currentCamera} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}