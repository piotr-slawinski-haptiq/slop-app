import { useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/elements/Button'

import styles from './NotificationPopover.module.css'

type NotificationPopoverProps = {
  notifications: Array<{
    id: number
    type: 'immediate' | 'threshold'
    message: string
    createdAt: Date
  }>
  onDismiss: (notificationId: number) => void | Promise<void>
}

function formatTimestamp(timestamp: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

export function NotificationPopover({
  notifications,
  onDismiss,
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.length

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={`${styles.triggerBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className={styles.icon}>🔔</span>
        <span className={styles.label}>Alerts</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.header}>
            <h3 className={styles.title}>Action Required</h3>
          </div>
          
          {unreadCount === 0 ? (
            <div className={styles.emptyState}>No new notifications</div>
          ) : (
            <ul className={styles.list}>
              {notifications.map((notification) => (
                <li key={notification.id} className={styles.item}>
                  <div
                    className={[
                      styles.itemIcon,
                      notification.type === 'immediate'
                        ? styles.itemIconImmediate
                        : styles.itemIconThreshold,
                    ].join(' ')}
                  >
                    {notification.type === 'immediate' ? '⚡' : '📦'}
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.message}>{notification.message}</p>
                    <p className={styles.meta}>
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                  <div className={styles.dismiss}>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => onDismiss(notification.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
