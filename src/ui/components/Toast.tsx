import { useEffect } from 'react'

import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error'

export interface ToastProps {
  id: string
  message: string
  variant: ToastVariant
  onDismiss: (id: string) => void
  duration?: number
}

export function Toast({
  id,
  message,
  variant,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, onDismiss, duration])

  return (
    <div
      className={[styles.toast, styles[variant]].join(' ')}
      role="status"
      aria-live="polite"
    >
      <p className={styles.message}>{message}</p>
      <button
        className={styles.closeBtn}
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        type="button"
      >
        ×
      </button>
    </div>
  )
}
