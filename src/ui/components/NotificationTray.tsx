import { Button } from '@/ui/elements/Button'

import styles from './NotificationTray.module.css'

type NotificationTrayProps = {
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

export function NotificationTray({
  notifications,
  onDismiss,
}: NotificationTrayProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Order alerts</h2>
      {notifications.length ? (
        <ul className={styles.list}>
          {notifications.map((notification) => (
            <li key={notification.id} className={styles.item}>
              <div>
                <p className={styles.message}>{notification.message}</p>
                <p className={styles.meta}>
                  {notification.type} · {formatTimestamp(notification.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="small"
                onClick={() => onDismiss(notification.id)}
              >
                Dismiss
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.meta}>No unread notifications.</p>
      )}
    </section>
  )
}
