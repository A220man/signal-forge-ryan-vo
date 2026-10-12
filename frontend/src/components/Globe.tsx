import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import Globe from 'globe.gl'
import type { CameraState, SavedLocation } from '@/types'

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
}

export const GlobeComponent = forwardRef<GlobeRef, { className?: string }>(({ className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ExtendedGlobeInstance | null>(null)
  const animationRef = useRef<number | null>(null)

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

  const flyTo = (lat: number, lng: number, altitude = 2.5, duration = 2000) => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat, lng, altitude }, duration)
  }

  const getCameraState = (): CameraState | null => {
    if (!globeRef.current) return null
    const pov = globeRef.current.pointOfView()
    return {
      lat: pov.lat,
      lng: pov.lng,
      altitude: pov.altitude,
      heading: 0,
      pitch: 0,
    }
  }

  const goToLocation = (location: SavedLocation) => {
    flyTo(location.camera.lat, location.camera.lng, location.camera.altitude)
  }

  const addMarker = (lat: number, lng: number, color = '#00d4aa', size = 0.5) => {
    if (!globeRef.current) return
    globeRef.current
      .pointsData([{ lat, lng, color, size }])
      .pointAltitude(0.01)
      .pointColor('color')
      .pointRadius('size')
  }

  const clearMarkers = () => {
    if (!globeRef.current) return
    globeRef.current.pointsData([])
  }

  useImperativeHandle(ref, () => ({
    flyTo,
    getCameraState,
    goToLocation,
    addMarker,
    clearMarkers,
  }))

  return <div ref={containerRef} className={`globe-container ${className || ''}`} />
})

GlobeComponent.displayName = 'Globe'