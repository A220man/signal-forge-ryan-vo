import { useState } from 'react'
import { XIcon, CheckCircleIcon, AlertCircleIcon, AlertTriangleIcon } from 'lucide-react'
import styles from './Toast.module.css'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className={styles.toastContainer} aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`} role="alert">
          <div className={styles.toastIcon}>
            {toast.type === 'success' && <CheckCircleIcon size={20} />}
            {toast.type === 'error' && <AlertCircleIcon size={20} />}
            {toast.type === 'warning' && <AlertTriangleIcon size={20} />}
            {toast.type === 'info' && <AlertCircleIcon size={20} />}
          </div>
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            className={styles.toastClose}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <XIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const success = (message: string) => addToast('success', message)
  const error = (message: string) => addToast('error', message)
  const warning = (message: string) => addToast('warning', message)
  const info = (message: string) => addToast('info', message)

  return { toasts, dismissToast, success, error, warning, info }
}