import { Button } from '@/ui/elements/Button'

import styles from './NotificationStrip.module.css'

type NotificationStripProps = {
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

export function NotificationStrip({
  notifications,
  onDismiss,
}: NotificationStripProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={styles.strip}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.icon}>⚠️</span>
            <h2 className={styles.title}>Action Required</h2>
            <span className={styles.badge}>{notifications.length}</span>
          </div>
        </div>

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
      </div>
    </div>
  )
}
