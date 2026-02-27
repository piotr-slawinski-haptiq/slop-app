import { useCallback, useEffect, useRef, useState } from 'react'

import { Toast, type ToastVariant } from './Toast'
import styles from './ToastContainer.module.css'

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
  maxVisible?: number
}

/* Must match grid collapse + toast exit in CSS (both use --transitionBase ~200ms) */
const EXIT_ANIMATION_DURATION = 220

export function ToastContainer({
  toasts,
  onRemove,
  maxVisible = 4,
}: ToastContainerProps) {
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())
  const visibleToasts = toasts.slice(-maxVisible)

  useEffect(() => {
    const idsToRemoveFromExiting: string[] = []

    exitingIds.forEach((id) => {
      if (!toasts.find((t) => t.id === id)) {
        idsToRemoveFromExiting.push(id)
      }
    })

    if (idsToRemoveFromExiting.length > 0) {
      setExitingIds(
        (prev) =>
          new Set([...prev].filter((id) => !idsToRemoveFromExiting.includes(id))),
      )
    }
  }, [toasts, exitingIds])

  const handleDismiss = useCallback(
    (id: string) => {
      setExitingIds((prev) => new Set(prev).add(id))

      setTimeout(() => {
        onRemove(id)
      }, EXIT_ANIMATION_DURATION)
    },
    [onRemove],
  )

  return (
    <div className={styles.container}>
      {visibleToasts.map((toast) => {
        const isExiting = exitingIds.has(toast.id)
        return (
          <div
            key={toast.id}
            className={`${styles.toastSlot} ${isExiting ? styles.exiting : ''}`}
          >
            <div className={styles.toastSlotInner}>
              <Toast
                id={toast.id}
                message={toast.message}
                variant={toast.variant}
                onDismiss={handleDismiss}
                isExiting={isExiting}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastIdCounter = useRef(0)

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${Date.now()}-${toastIdCounter.current++}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback(
    (message: string) => {
      addToast(message, 'success')
    },
    [addToast],
  )

  const showError = useCallback(
    (message: string) => {
      addToast(message, 'error')
    },
    [addToast],
  )

  return {
    toasts,
    showSuccess,
    showError,
    removeToast,
  }
}
