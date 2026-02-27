import { useCallback, useEffect, useRef, useState } from 'react'

import { Toast, ToastVariant } from './Toast'
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

export function ToastContainer({
  toasts,
  onRemove,
  maxVisible = 4,
}: ToastContainerProps) {
  const visibleToasts = toasts.slice(-maxVisible)

  const handleDismiss = useCallback(
    (id: string) => {
      onRemove(id)
    },
    [onRemove],
  )

  return (
    <div className={styles.container}>
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={handleDismiss}
        />
      ))}
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
