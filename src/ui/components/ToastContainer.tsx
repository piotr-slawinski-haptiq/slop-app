import { useCallback, useEffect, useRef, useState } from 'react'

import { Toast, type ToastData, type ToastVariant } from './Toast'
import styles from './ToastContainer.module.css'

const COLLAPSE_DURATION_MS = 200

interface ToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
  maxVisible?: number
}

export function ToastContainer({
  toasts,
  onRemove,
  maxVisible = 4,
}: ToastContainerProps) {
  const visibleToasts = toasts.slice(-maxVisible)

  return (
    <div className={styles.container} aria-label="Notifications">
      {visibleToasts.map((toast) => (
        <ToastSlot key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

/**
 * Wraps each Toast in a collapsible slot so remaining toasts shift smoothly
 * when one exits. Two-phase exit:
 *   1. Toast slides out (handled by Toast component via CSS animation)
 *   2. Slot collapses height (grid-template-rows 1fr → 0fr)
 */
function ToastSlot({
  toast,
  onRemove,
}: {
  toast: ToastData
  onRemove: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const handleExitComplete = useCallback(() => {
    setCollapsed(true)
  }, [])

  useEffect(() => {
    if (!collapsed) return
    const timer = setTimeout(() => onRemove(toast.id), COLLAPSE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [collapsed, toast.id, onRemove])

  return (
    <div className={styles.slot} data-collapsed={collapsed || undefined}>
      <div className={styles.slotInner}>
        <Toast toast={toast} onExitComplete={handleExitComplete} />
      </div>
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counterRef = useRef(0)

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${Date.now()}-${counterRef.current++}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast],
  )

  const showError = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast],
  )

  return { toasts, showSuccess, showError, removeToast }
}
