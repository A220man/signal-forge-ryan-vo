import type { CameraState } from '../types'
import styles from './HUD.module.css'

interface HUDProps {
  camera: CameraState | null
}

export function HUD({ camera }: HUDProps) {
  if (!camera) return null

  return (
    <div className={styles.hud} role="status" aria-live="polite" aria-label="Camera position">
      <div className={styles.hudItem}>
        <span className={styles.hudLabel}>Lat</span>
        <span className={`${styles.hudValue} ${styles.primary}`}>{camera.lat.toFixed(6)}°</span>
      </div>
      <div className={styles.hudDivider} aria-hidden="true" />
      <div className={styles.hudItem}>
        <span className={styles.hudLabel}>Lng</span>
        <span className={`${styles.hudValue} ${styles.primary}`}>{camera.lng.toFixed(6)}°</span>
      </div>
      <div className={styles.hudDivider} aria-hidden="true" />
      <div className={styles.hudItem}>
        <span className={styles.hudLabel}>Alt</span>
        <span className={styles.hudValue}>{camera.altitude.toFixed(2)}</span>
      </div>
      <div className={styles.hudDivider} aria-hidden="true" />
      <div className={styles.hudItem}>
        <span className={styles.hudLabel}>Heading</span>
        <span className={styles.hudValue}>{camera.heading.toFixed(0)}°</span>
      </div>
      <div className={styles.hudDivider} aria-hidden="true" />
      <div className={styles.hudItem}>
        <span className={styles.hudLabel}>Pitch</span>
        <span className={styles.hudValue}>{camera.pitch.toFixed(0)}°</span>
      </div>
    </div>
  )
}