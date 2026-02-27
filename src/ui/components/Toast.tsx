import { useCallback, useEffect, useRef, useState } from 'react'

import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error'

export interface ToastData {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastProps {
  toast: ToastData
  onExitComplete: (id: string) => void
  duration?: number
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M2.5 6L5 8.5L9.5 3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const AlertIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M6 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="9.5" r="1" fill="currentColor" />
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export function Toast({ toast, onExitComplete, duration = 5000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const elapsedRef = useRef(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (isExiting) return

    if (isPaused) {
      elapsedRef.current += Date.now() - startRef.current
      clearTimeout(timerRef.current)
      return
    }

    startRef.current = Date.now()
    const remaining = duration - elapsedRef.current

    if (remaining <= 0) {
      setIsExiting(true)
      return
    }

    timerRef.current = setTimeout(() => setIsExiting(true), remaining)
    return () => clearTimeout(timerRef.current)
  }, [isPaused, duration, isExiting])

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
  }, [])

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (e.target !== e.currentTarget) return
      if (isExiting) {
        onExitComplete(toast.id)
      }
    },
    [isExiting, toast.id, onExitComplete],
  )

  return (
    <div
      className={styles.toast}
      data-variant={toast.variant}
      data-exiting={isExiting || undefined}
      data-paused={isPaused || undefined}
      onAnimationEnd={handleAnimationEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon}>
        {toast.variant === 'success' ? <CheckIcon /> : <AlertIcon />}
      </span>
      <p className={styles.message}>{toast.message}</p>
      <button
        className={styles.dismiss}
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <CloseIcon />
      </button>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
}
