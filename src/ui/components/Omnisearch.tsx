import { useMemo, useState } from 'react'

import { Button } from '@/ui/elements/Button'
import { Input } from '@/ui/elements/Input'

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
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        placeholder="Search products or create one…"
      />
      {isOpen && normalized ? (
        <div className={styles.results}>
          {matches.length ? (
            matches.map((item) => (
              <button
                key={item.id}
                className={styles.resultButton}
                onClick={() => addAndReset(item.id)}
                type="button"
              >
                {item.name} · {item.category}
              </button>
            ))
          ) : (
            <p className={styles.emptyHint}>
              No item found. {canCreate ? 'Create it from this search.' : ''}
            </p>
          )}
          {canCreate && normalized ? (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={createAndReset}
            >
              Create “{query.trim()}”
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
