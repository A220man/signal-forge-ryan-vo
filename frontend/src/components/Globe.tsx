import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import Globe from 'globe.gl'
import type { CameraFeed, CameraState, SavedLocation } from '@/types'

type GlobeInstance = InstanceType<typeof Globe>

interface ExtendedGlobeInstance extends GlobeInstance {
  graticuleColor(color: string | ((data: unknown) => string)): this
  graticuleWidth(width: number): this
  tick(): void
}

export interface GlobeRef {
  flyTo: (lat: number, lng: number, altitude?: number, duration?: number) => void
  getCameraState: () => CameraState | null
  goToLocation: (location: SavedLocation) => void
  addMarker: (lat: number, lng: number, color?: string, size?: number) => void
  clearMarkers: () => void
  addCameraMarker: (camera: CameraFeed) => void
  clearCameraMarkers: () => void
  setSelectedCamera: (camera: CameraFeed | null) => void
}

export const GlobeComponent = forwardRef<GlobeRef, { className?: string }>(({ className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ExtendedGlobeInstance | null>(null)
  const animationRef = useRef<number | null>(null)
  const cameraMarkersRef = useRef<Map<string, GlobeInstance>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const baseGlobe = new Globe(containerRef.current)
    const extendedGlobe = baseGlobe as unknown as ExtendedGlobeInstance

    extendedGlobe
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showGraticules(true)
    // @ts-ignore - graticuleColor not in official types but exists at runtime
      .graticuleColor(() => '#3a5066')
    // @ts-ignore - graticuleWidth not in official types but exists at runtime
      .graticuleWidth(0.5)
      .showAtmosphere(true)
      .atmosphereColor('#00d4aa')
      .atmosphereAltitude(0.15)
      .pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0)

    globeRef.current = extendedGlobe

    const animate = () => {
      extendedGlobe.tick()
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const flyTo = useCallback((lat: number, lng: number, altitude = 2.5, duration = 2000) => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat, lng, altitude }, duration)
  }, [])

  const getCameraState = useCallback((): CameraState | null => {
    if (!globeRef.current) return null
    const pov = globeRef.current.pointOfView()
    return {
      lat: pov.lat,
      lng: pov.lng,
      altitude: pov.altitude,
      heading: 0,
      pitch: 0,
    }
  }, [])

  const goToLocation = useCallback((location: SavedLocation) => {
    flyTo(location.camera.lat, location.camera.lng, location.camera.altitude)
  }, [flyTo])

  const addMarker = useCallback((lat: number, lng: number, color = '#00d4aa', size = 0.5) => {
    if (!globeRef.current) return
    globeRef.current
      .pointsData([{ lat, lng, color, size }])
      .pointAltitude(0.01)
      .pointColor('color')
      .pointRadius('size')
  }, [])

  const clearMarkers = useCallback(() => {
    if (!globeRef.current) return
    globeRef.current.pointsData([])
  }, [])

  const addCameraMarker = useCallback((camera: CameraFeed) => {
    if (!globeRef.current) return

    const color = camera.status === 'active' ? '#00d4aa' : camera.status === 'inactive' ? '#ff4444' : '#ffaa00'
    const markerGlobe = new Globe(document.createElement('div'))

    markerGlobe
      .pointsData([{ lat: camera.lat, lng: camera.lng, color, size: 0.8, camera }])
      .pointAltitude(0.01)
      .pointColor('color')
      .pointRadius('size')
      // @ts-ignore - globe.gl types are incomplete for custom data accessors
      .pointLabel((d: { camera: CameraFeed }) => d.camera.name)
      .labelColor(() => '#fff')
      .labelSize(0.3)
      .labelAltitude(0.02)
      // @ts-ignore - globe.gl types are incomplete for custom data accessors
      .labelRotation((d: { camera: CameraFeed }) => d.camera.lat * 0.017)

    cameraMarkersRef.current.set(camera.id, markerGlobe)
  }, [])

  const clearCameraMarkers = useCallback(() => {
    if (!globeRef.current) return
    cameraMarkersRef.current.clear()
    globeRef.current.pointsData([])
  }, [])

  const setSelectedCamera = useCallback((camera: CameraFeed | null) => {
    if (!globeRef.current) return

    // Re-render all markers with updated selection state
    const markers = Array.from(cameraMarkersRef.current.values())
    if (markers.length > 0) {
      const allData = markers.flatMap(m => m.pointsData() as Array<{ lat: number; lng: number; color: string; size: number; camera: CameraFeed }>)
      const updatedData = allData.map(item => ({
        ...item,
        color: item.camera.id === camera?.id ? '#ffff00' : (item.camera.status === 'active' ? '#00d4aa' : item.camera.status === 'inactive' ? '#ff4444' : '#ffaa00'),
        size: item.camera.id === camera?.id ? 1.2 : 0.8,
      }))
      globeRef.current.pointsData(updatedData)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    flyTo,
    getCameraState,
    goToLocation,
    addMarker,
    clearMarkers,
    addCameraMarker,
    clearCameraMarkers,
    setSelectedCamera,
  }))

  return <div ref={containerRef} className={`globe-container ${className || ''}`} />
})

GlobeComponent.displayName = 'Globe'