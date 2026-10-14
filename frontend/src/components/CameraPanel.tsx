import { useState, useCallback, useEffect, KeyboardEvent } from 'react'
import { XIcon, WifiIcon, WifiOffIcon, HelpCircleIcon, Maximize2Icon } from 'lucide-react'
import type { CameraFeed, CameraState } from '../types'
import styles from './CameraPanel.module.css'

interface CameraPanelProps {
  cameras: CameraFeed[]
  selectedCamera: CameraFeed | null
  onSelectCamera: (camera: CameraFeed | null) => void
  onFlyToCamera: (camera: CameraFeed) => void
  currentCamera: CameraState | null
}

export function CameraPanel({
  cameras,
  selectedCamera,
  onSelectCamera,
  onFlyToCamera,
  currentCamera,
}: CameraPanelProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expanded, setExpanded] = useState(false)

  const filteredCameras = cameras.filter((cam) => {
    if (filter === 'all') return true
    return cam.status === filter
  })

  const activeCount = cameras.filter((c) => c.status === 'active').length
  const inactiveCount = cameras.filter((c) => c.status === 'inactive').length
  const unknownCount = cameras.filter((c) => c.status === 'unknown').length

  const handleCameraClick = useCallback((camera: CameraFeed) => {
    if (selectedCamera?.id === camera.id) {
      onSelectCamera(null)
    } else {
      onSelectCamera(camera)
    }
  }, [selectedCamera, onSelectCamera])

  const handleFlyTo = useCallback((camera: CameraFeed, e: React.MouseEvent) => {
    e.stopPropagation()
    onFlyToCamera(camera)
  }, [onFlyToCamera])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, camera: CameraFeed) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCameraClick(camera)
    } else if (e.key === 'Escape') {
      onSelectCamera(null)
    }
  }, [handleCameraClick, onSelectCamera])

  if (cameras.length === 0) return null

  return (
    <div className={`${styles.cameraPanel} ${expanded ? styles.expanded : ''} ${!expanded ? styles.collapsed : ''}`}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>
          <WifiIcon size={18} />
          <span>Traffic Cameras</span>
          <span className={styles.count}>{cameras.length}</span>
        </div>
        <div className={styles.statusSummary}>
          <span className={`${styles.statusDot} ${styles.active}`} title={`${activeCount} active`} />
          <span className={`${styles.statusDot} ${styles.inactive}`} title={`${inactiveCount} inactive`} />
          <span className={`${styles.statusDot} ${styles.unknown}`} title={`${unknownCount} unknown`} />
        </div>
      </div>

      {expanded && (
        <div className={styles.content}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'active' ? styles.activeFilter : ''}`}
              onClick={() => setFilter('active')}
            >
              Active
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'inactive' ? styles.activeFilter : ''}`}
              onClick={() => setFilter('inactive')}
            >
              Inactive
            </button>
          </div>

          <div className={styles.cameraList}>
            {filteredCameras.map((camera) => (
              <div
                key={camera.id}
                className={`${styles.cameraItem} ${selectedCamera?.id === camera.id ? styles.selected : ''} ${styles[camera.status]}`}
                onClick={() => handleCameraClick(camera)}
                onKeyDown={(e) => handleKeyDown(e, camera)}
                tabIndex={0}
                role="button"
                aria-pressed={selectedCamera?.id === camera.id}
                aria-label={`${camera.name}, ${camera.status}`}
              >
                <div className={styles.cameraIcon}>
                  {camera.status === 'active' && <WifiIcon size={16} />}
                  {camera.status === 'inactive' && <WifiOffIcon size={16} />}
                  {camera.status === 'unknown' && <HelpCircleIcon size={16} />}
                </div>
                <div className={styles.cameraInfo}>
                  <span className={styles.cameraName}>{camera.name}</span>
                  <span className={styles.cameraCoords}>
                    {camera.lat.toFixed(4)}°, {camera.lng.toFixed(4)}°
                  </span>
                </div>
                <button
                  className={styles.flyToBtn}
                  onClick={(e) => handleFlyTo(camera, e)}
                  aria-label={`Fly to ${camera.name}`}
                  title="Fly to camera"
                >
                  <Maximize2Icon size={14} />
                </button>
              </div>
            ))}
          </div>

          {selectedCamera && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <span>{selectedCamera.name}</span>
                <button
                  className={styles.closePreview}
                  onClick={() => onSelectCamera(null)}
                  aria-label="Close preview"
                >
                  <XIcon size={16} />
                </button>
              </div>
              <img
                src={selectedCamera.image_url}
                alt={`Camera feed: ${selectedCamera.name}`}
                className={styles.previewImage}
                crossOrigin="anonymous"
              />
              <div className={styles.previewMeta}>
                <span>Status: <strong>{selectedCamera.status}</strong></span>
                <span>Source: {selectedCamera.source}</span>
                {selectedCamera.attribution && <span>{selectedCamera.attribution}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}