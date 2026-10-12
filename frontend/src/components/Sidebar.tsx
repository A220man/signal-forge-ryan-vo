import { useState, useCallback, KeyboardEvent } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, Edit2Icon, Trash2Icon, PlusIcon, StarIcon } from 'lucide-react'
import type { SavedLocation, CameraState } from '../types'
import styles from './Sidebar.module.css'

interface SidebarProps {
  savedLocations: SavedLocation[]
  activeLocationId: string | null
  onSelectLocation: (location: SavedLocation) => void
  onSaveLocation: (name: string, camera: CameraState) => void
  onRenameLocation: (id: string, name: string) => void
  onDeleteLocation: (id: string) => void
  currentCamera: CameraState | null
}

export function Sidebar({
  savedLocations,
  activeLocationId,
  onSelectLocation,
  onSaveLocation,
  onRenameLocation,
  onDeleteLocation,
  currentCamera,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [modalName, setModalName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    if (!currentCamera || !modalName.trim()) return
    onSaveLocation(modalName.trim(), currentCamera)
    setShowSaveModal(false)
    setModalName('')
  }, [currentCamera, modalName, onSaveLocation])

  const handleRename = useCallback(() => {
    if (!renameId || !modalName.trim()) return
    onRenameLocation(renameId, modalName.trim())
    setShowRenameModal(false)
    setRenameId(null)
    setModalName('')
  }, [renameId, modalName, onRenameLocation])

  const openSaveModal = useCallback(() => {
    if (currentCamera) {
      setModalName('')
      setShowSaveModal(true)
    }
  }, [currentCamera])

  const openRenameModal = useCallback((id: string, name: string) => {
    setRenameId(id)
    setModalName(name)
    setShowRenameModal(true)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, location: SavedLocation) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectLocation(location)
    }
  }, [onSelectLocation])

  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDeleteLocation(id)
  }, [onDeleteLocation])

  const handleRenameClick = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    openRenameModal(id, name)
  }, [openRenameModal])

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} aria-label="Locations panel">
        <div className={styles.sidebarHeader}>
          {!collapsed && <h2 className={styles.sidebarTitle}>Locations</h2>}
          <button
            className={styles.sidebarToggle}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRightIcon size={20} /> : <ChevronLeftIcon size={20} />}
          </button>
        </div>

        <div className={styles.sidebarContent}>
          <div className={styles.sidebarSection}>
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.saveLocationBtn}`}
              onClick={openSaveModal}
              disabled={!currentCamera}
              aria-label="Save current location"
            >
              <PlusIcon size={16} aria-hidden="true" />
              {!collapsed && <span>Save Location</span>}
            </button>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarSectionTitle}>Saved</h3>
            <div className={styles.locationList} role="listbox" aria-label="Saved locations">
              {savedLocations.length === 0 ? (
                <div className={styles.emptyState}>
                  {!collapsed && <p>No saved locations yet</p>}
                </div>
              ) : (
                savedLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`${styles.locationItem} ${activeLocationId === location.id ? styles.active : ''}`}
                    role="option"
                    tabIndex={0}
                    aria-selected={activeLocationId === location.id}
                    onClick={() => onSelectLocation(location)}
                    onKeyDown={(e) => handleKeyDown(e, location)}
                  >
                    <StarIcon className={styles.locationIcon} size={16} aria-hidden="true" />
                    {!collapsed && (
                      <div className={styles.locationInfo}>
                        <div className={styles.locationName}>{location.name}</div>
                        <div className={styles.locationCoords}>
                          {location.camera.lat.toFixed(4)}°, {location.camera.lng.toFixed(4)}°
                        </div>
                      </div>
                    )}
                    <div className={styles.locationActions}>
                      <button
                        className={`${styles.locationActionBtn} ${styles.editBtn}`}
                        onClick={(e) => handleRenameClick(e, location.id, location.name)}
                        aria-label={`Rename ${location.name}`}
                      >
                        <Edit2Icon size={14} aria-hidden="true" />
                      </button>
                      <button
                        className={`${styles.locationActionBtn} ${styles.deleteBtn}`}
                        onClick={(e) => handleDeleteClick(e, location.id)}
                        aria-label={`Delete ${location.name}`}
                      >
                        <Trash2Icon size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Save Location</h3>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Enter a name"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={!modalName.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRenameModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Rename Location</h3>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Enter a name"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowRenameModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRename} disabled={!modalName.trim()}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}