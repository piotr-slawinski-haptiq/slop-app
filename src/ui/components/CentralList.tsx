import { useState } from 'react'

import { Button } from '@/ui/elements/Button'

import styles from './CentralList.module.css'

type CentralListProps = {
  entries: Array<{
    id: number
    itemId: number
    itemName: string
    itemCategory: string
    requesterEmail: string
  }>
  thresholdLabel: string
  thresholdProgress: number
  canFulfill: boolean
  isScattering: boolean
  onCancel: (requestId: number) => void | Promise<void>
  onFulfill: () => void | Promise<void>
  onDropAdd: (itemId: number) => void | Promise<void>
}

export function CentralList({
  entries,
  thresholdLabel,
  thresholdProgress,
  canFulfill,
  isScattering,
  onCancel,
  onFulfill,
  onDropAdd,
}: CentralListProps) {
  const [isDropActive, setIsDropActive] = useState(false)

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDropActive(true)
  }

  function onDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDropActive(false)
  }

  async function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDropActive(false)

    const payload = event.dataTransfer.getData('text/slop-item-id')
    const itemId = Number(payload)
    if (Number.isFinite(itemId) && itemId > 0) {
      await onDropAdd(itemId)
    }
  }

  return (
    <section
      className={[styles.panel, isDropActive ? styles.dropTarget : ''].join(
        ' ',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>Order List</h2>
            <p className={styles.subTitle}>Shared office shopping list</p>
          </div>
        </div>
        {entries.length > 0 && (
          <span className={styles.countBadge}>{entries.length}</span>
        )}
      </header>

      <div className={styles.body}>
        {entries.length ? (
          <ul className={styles.list}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={styles.row}
                style={isScattering ? { animation: 'none' } : undefined}
              >
                <span className={styles.rowDot} />
                <div className={styles.rowContent}>
                  <p className={styles.rowName}>{entry.itemName}</p>
                  <p className={styles.rowMeta}>
                    {entry.itemCategory} · {entry.requesterEmail}
                  </p>
                </div>
                <div className={styles.cancelBtn}>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onCancel(entry.id)}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <p className={styles.empty}>
              The list is empty. Search for an item or drag a product card here
              to get started.
            </p>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p className={styles.threshold}>{thresholdLabel}</p>
          <div className={styles.thresholdBar}>
            <div
              className={styles.thresholdFill}
              style={{
                width: `${Math.min(thresholdProgress * 100, 100)}%`,
              }}
            />
          </div>
        </div>
        {canFulfill && entries.length > 0 ? (
          <Button onClick={onFulfill}>Mark as ordered</Button>
        ) : null}
      </footer>
    </section>
  )
}
