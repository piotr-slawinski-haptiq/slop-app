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
  canFulfill: boolean
  isScattering: boolean
  onCancel: (requestId: number) => void | Promise<void>
  onFulfill: () => void | Promise<void>
  onDropAdd: (itemId: number) => void | Promise<void>
}

export function CentralList({
  entries,
  thresholdLabel,
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
      className={[styles.panel, isDropActive ? styles.dropTarget : ''].join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.headingRow}>
        <div>
          <h2 className={styles.title}>Current order list</h2>
          <p className={styles.subTitle}>One shared list for everyone</p>
        </div>
      </header>

      {entries.length ? (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={styles.row}
              style={isScattering ? { animation: 'none' } : undefined}
            >
              <div>
                <p className={styles.rowName}>{entry.itemName}</p>
                <p className={styles.rowMeta}>
                  {entry.itemCategory} · added by {entry.requesterEmail}
                </p>
              </div>
              <Button
                variant="ghost"
                size="small"
                onClick={() => onCancel(entry.id)}
              >
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          The list is empty. Add an item from a card or drop it here.
        </p>
      )}

      <footer className={styles.footer}>
        <p className={styles.threshold}>{thresholdLabel}</p>
        {canFulfill ? (
          <Button onClick={onFulfill}>Mark as ordered</Button>
        ) : null}
      </footer>
    </section>
  )
}
