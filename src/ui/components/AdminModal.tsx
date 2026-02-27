import { useState } from 'react'

import { Button } from '@/ui/elements/Button'
import { Input } from '@/ui/elements/Input'

import styles from './AdminModal.module.css'

type Item = {
  id: number
  name: string
  category: string
  isEvergreen: boolean
}

type PastFulfillment = {
  id: number
  trigger: string
  fulfilledAt: Date | null
  requests: Array<{
    itemName: string
  }>
}

type AdminModalProps = {
  isOpen: boolean
  onClose: () => void
  items: Item[]
  pastFulfillments: PastFulfillment[]
  currentThreshold: number
  onCreateItem: (data: {
    name: string
    category: string
    isEvergreen: boolean
  }) => void | Promise<void>
  onDeleteItem: (itemId: number) => void | Promise<void>
  onToggleEvergreen: (item: Item) => void | Promise<void>
  onUpdateThreshold: (value: number) => void | Promise<void>
}

function formatDate(input: Date | null): string {
  if (!input) {
    return '—'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(input))
}

export function AdminModal({
  isOpen,
  onClose,
  items,
  pastFulfillments,
  currentThreshold,
  onCreateItem,
  onDeleteItem,
  onToggleEvergreen,
  onUpdateThreshold,
}: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'history'>(
    'catalog',
  )
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('General')
  const [isEvergreen, setIsEvergreen] = useState(false)
  const [thresholdInput, setThresholdInput] = useState(String(currentThreshold))

  if (!isOpen) {
    return null
  }

  const handleCreateItem = async () => {
    await onCreateItem({ name: itemName, category: itemCategory, isEvergreen })
    setItemName('')
    setItemCategory('General')
    setIsEvergreen(false)
  }

  const handleUpdateThreshold = async () => {
    const parsed = Number(thresholdInput)
    await onUpdateThreshold(parsed)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Admin Panel</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={[
              styles.tab,
              activeTab === 'catalog' ? styles.tabActive : '',
            ].join(' ')}
            onClick={() => setActiveTab('catalog')}
          >
            Catalog
          </button>
          <button
            className={[
              styles.tab,
              activeTab === 'settings' ? styles.tabActive : '',
            ].join(' ')}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={[
              styles.tab,
              activeTab === 'history' ? styles.tabActive : '',
            ].join(' ')}
            onClick={() => setActiveTab('history')}
          >
            Order History
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'catalog' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Catalog Management</h3>
                <p className={styles.sectionDescription}>
                  Add, edit, and remove items from the product catalog.
                </p>
              </div>

              <div className={styles.catalogForm}>
                <div className={styles.catalogFormField}>
                  <span className={styles.fieldLabel}>Name</span>
                  <Input
                    value={itemName}
                    placeholder="Item name"
                    onChange={(event) => setItemName(event.target.value)}
                  />
                </div>
                <div className={styles.catalogFormField}>
                  <span className={styles.fieldLabel}>Category</span>
                  <Input
                    value={itemCategory}
                    placeholder="Category"
                    onChange={(event) => setItemCategory(event.target.value)}
                  />
                </div>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isEvergreen}
                    onChange={(event) => setIsEvergreen(event.target.checked)}
                  />
                  Staple item (triggers immediate notification)
                </label>
                <Button onClick={handleCreateItem} size="small">
                  Save Item
                </Button>
              </div>

              <div className={styles.itemsListWrapper}>
                <h4 className={styles.listHeading}>
                  All Items ({items.length})
                </h4>
                <ul className={styles.itemsList}>
                  {items.map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemCat}>{item.category}</span>
                        {item.isEvergreen && (
                          <span className={styles.itemBadge}>STAPLE</span>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => onToggleEvergreen(item)}
                        >
                          {item.isEvergreen ? 'Unmark' : 'Mark staple'}
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => onDeleteItem(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Fulfillment Threshold</h3>
                <p className={styles.sectionDescription}>
                  Set the minimum number of distinct items that trigger a
                  notification to place an order.
                </p>
              </div>

              <div className={styles.thresholdForm}>
                <div className={styles.thresholdField}>
                  <span className={styles.fieldLabel}>
                    Minimum items for threshold notification
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={thresholdInput}
                    onChange={(event) => setThresholdInput(event.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateThreshold} size="small">
                  Update Threshold
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Order History</h3>
                <p className={styles.sectionDescription}>
                  View past fulfilled orders and their items.
                </p>
              </div>

              {pastFulfillments.length ? (
                <ul className={styles.historyList}>
                  {pastFulfillments.map((fulfillment) => (
                    <li key={fulfillment.id} className={styles.historyRow}>
                      <p className={styles.historyTitle}>
                        Order #{fulfillment.id}
                      </p>
                      <p className={styles.historyMeta}>
                        {fulfillment.trigger} · {formatDate(fulfillment.fulfilledAt)}
                      </p>
                      <p className={styles.historyMeta}>
                        {fulfillment.requests
                          .map((request) => request.itemName)
                          .join(', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.historyEmpty}>No past orders yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
