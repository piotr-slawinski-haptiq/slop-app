import { useCallback, useEffect, useRef, useState } from 'react'

import { Toast, type ToastData, type ToastVariant } from './Toast'
import styles from './ToastContainer.module.css'

const COLLAPSE_DURATION_MS = 200
const FORCE_EXIT_STAGGER_MS = 80
const MAX_TOAST_BUFFER = 12

interface ToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
  maxVisible?: number
}

/**
 * Renders ALL toasts (no slicing). When the count exceeds maxVisible,
 * oldest overflow toasts are force-exited with a stagger delay so
 * they animate out individually instead of disappearing in batches.
 */
export function ToastContainer({
  toasts,
  onRemove,
  maxVisible = 5,
}: ToastContainerProps) {
  const excessCount = Math.max(0, toasts.length - maxVisible)

  return (
    <div className={styles.container} aria-label="Notifications">
      {toasts.map((toast, index) => (
        <ToastSlot
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          forceExitDelay={
            index < excessCount ? index * FORCE_EXIT_STAGGER_MS : undefined
          }
        />
      ))}
    </div>
  )
}

/**
 * Wraps each Toast in a collapsible slot so remaining toasts shift smoothly
 * when one exits. Two-phase exit:
 *   1. Toast slides out (handled by Toast component via CSS animation)
 *   2. Slot collapses height (grid-template-rows 1fr → 0fr)
 *
 * When forceExitDelay is set, the toast is scheduled for early dismissal
 * after the given delay (ms), creating a staggered overflow exit.
 */
function ToastSlot({
  toast,
  onRemove,
  forceExitDelay,
}: {
  toast: ToastData
  onRemove: (id: string) => void
  forceExitDelay?: number
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [forceExit, setForceExit] = useState(false)

  useEffect(() => {
    if (forceExitDelay == null || forceExit) return

    if (forceExitDelay === 0) {
      setForceExit(true)
      return
    }

    const timer = setTimeout(() => setForceExit(true), forceExitDelay)
    return () => clearTimeout(timer)
  }, [forceExitDelay, forceExit])

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
        <Toast
          toast={toast}
          onExitComplete={handleExitComplete}
          forceExit={forceExit}
        />
      </div>
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counterRef = useRef(0)

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${Date.now()}-${counterRef.current++}`
    setToasts((prev) => {
      const next = [...prev, { id, message, variant }]
      if (next.length > MAX_TOAST_BUFFER) {
        return next.slice(-MAX_TOAST_BUFFER)
      }
      return next
    })
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
