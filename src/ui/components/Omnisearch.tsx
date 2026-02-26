import { useMemo, useState } from 'react'

import { Button } from '@/ui/elements/Button'

import styles from './Omnisearch.module.css'

type OmnisearchProps = {
  items: Array<{
    id: number
    name: string
    category: string
  }>
  canCreate: boolean
  onAddExisting: (itemId: number) => void | Promise<void>
  onCreateItem: (name: string) => void | Promise<void>
}

export function Omnisearch({
  items,
  canCreate,
  onAddExisting,
  onCreateItem,
}: OmnisearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const normalized = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!normalized) {
      return []
    }

    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(normalized) ||
          item.category.toLowerCase().includes(normalized),
      )
      .slice(0, 8)
  }, [items, normalized])

  async function addAndReset(itemId: number) {
    await onAddExisting(itemId)
    setQuery('')
    setIsOpen(false)
  }

  async function createAndReset() {
    if (!normalized) {
      return
    }
    await onCreateItem(query.trim())
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className={styles.shell}>
      <div className={styles.searchWrap}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search for an item or create a new one…"
        />
      </div>

      {isOpen && normalized ? (
        <div className={styles.results}>
          {matches.length ? (
            matches.map((item) => (
              <button
                key={item.id}
                className={styles.resultItem}
                onClick={() => addAndReset(item.id)}
                type="button"
              >
                <span>
                  <span className={styles.resultItemName}>{item.name}</span>
                  <span className={styles.resultItemDot}> · </span>
                  <span className={styles.resultItemCategory}>
                    {item.category}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className={styles.emptyHint}>
              No matching item found.
              {canCreate ? ' You can create it below.' : ''}
            </p>
          )}
          {canCreate && normalized ? (
            <div className={styles.createRow}>
              <Button
                type="button"
                variant="green"
                size="small"
                onClick={createAndReset}
              >
                + Create "{query.trim()}"
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
