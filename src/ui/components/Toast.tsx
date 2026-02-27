import { useEffect } from 'react'

import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error'

export interface ToastProps {
  id: string
  message: string
  variant: ToastVariant
  onDismiss: (id: string) => void
  duration?: number
  isExiting?: boolean
}

export function Toast({
  id,
  message,
  variant,
  onDismiss,
  duration = 5000,
  isExiting = false,
}: ToastProps) {
  useEffect(() => {
    if (isExiting) {
      return
    }

    const timer = setTimeout(() => {
      onDismiss(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, onDismiss, duration, isExiting])

  const classNames = [
    styles.toast,
    styles[variant],
    isExiting ? styles.exiting : '',
  ]
    .filter(Boolean)
    .join(' ')

  const iconChar = variant === 'success' ? '✓' : '✕'
  return (
    <div className={classNames} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        {iconChar}
      </span>
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
