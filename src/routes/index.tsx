import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { getCurrentUserFn, logoutFn } from '@/lib/server-fns/auth.functions'
import {
  addRequestFn,
  cancelRequestFn,
  deleteItemFn,
  findOrCreateItemFn,
  fulfillCurrentListFn,
  getDashboardDataFn,
  markNotificationReadFn,
  updateThresholdFn,
  upsertItemFn,
} from '@/lib/server-fns/slop.functions'
import { CentralList } from '@/ui/components/CentralList'
import { NotificationTray } from '@/ui/components/NotificationTray'
import { Omnisearch } from '@/ui/components/Omnisearch'
import { ProductCard } from '@/ui/components/ProductCard'
import { Button } from '@/ui/elements/Button'
import { Input } from '@/ui/elements/Input'

import styles from './index.module.css'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    return getDashboardDataFn()
  },
  component: DashboardPage,
})

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unexpected error. Please try again.'
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

function DashboardPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('General')
  const [isEvergreen, setIsEvergreen] = useState(false)
  const [thresholdInput, setThresholdInput] = useState(
    String(data.threshold.minPendingItems),
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isScattering, setIsScattering] = useState(false)

  const currentUser = data.currentUser
  const isOrderer = currentUser.role === 'orderer'

  async function refreshData() {
    await router.invalidate()
  }

  async function withFeedback<T>(
    action: () => Promise<T>,
    successMessage?: string,
  ): Promise<T | null> {
    setErrorMessage('')
    if (successMessage) {
      setInfoMessage('')
    }

    try {
      const result = await action()
      if (successMessage) {
        setInfoMessage(successMessage)
      }
      await refreshData()
      return result
    } catch (error) {
      setErrorMessage(formatError(error))
      return null
    }
  }

  async function onAddRequest(itemId: number) {
    const result = await withFeedback(
      () =>
        addRequestFn({
          data: { itemId },
        }),
      undefined,
    )

    if (!result) {
      return
    }

    if (result.alreadyOnList) {
      setInfoMessage('Item already on the list.')
      return
    }

    if (result.trigger === 'immediate') {
      setInfoMessage('Staple item added — order notification sent!')
    } else if (result.trigger === 'threshold') {
      setInfoMessage('Threshold reached — time to place an order!')
    } else {
      setInfoMessage('Item added to the list.')
    }
  }

  async function onCancelRequest(requestId: number) {
    await withFeedback(
      () =>
        cancelRequestFn({
          data: { requestId },
        }),
      'Removed from list.',
    )
  }

  async function onCreateItem() {
    await withFeedback(
      async () => {
        await upsertItemFn({
          data: {
            name: itemName,
            category: itemCategory,
            isEvergreen,
          },
        })

        setItemName('')
        setItemCategory('General')
        setIsEvergreen(false)
      },
      'Catalog item saved.',
    )
  }

  async function onCreateFromSearch(name: string) {
    const created = await withFeedback(
      () =>
        findOrCreateItemFn({
          data: { name },
        }),
      undefined,
    )

    if (!created) {
      return
    }

    await onAddRequest(created.id)
  }

  async function onDeleteItem(itemId: number) {
    await withFeedback(
      () =>
        deleteItemFn({
          data: { itemId },
        }),
      'Item deleted from catalog.',
    )
  }

  async function onToggleEvergreen(item: {
    id: number
    name: string
    category: string
    isEvergreen: boolean
  }) {
    await withFeedback(
      () =>
        upsertItemFn({
          data: {
            id: item.id,
            name: item.name,
            category: item.category,
            isEvergreen: !item.isEvergreen,
          },
        }),
      'Item updated.',
    )
  }

  async function onUpdateThreshold() {
    const parsed = Number(thresholdInput)
    await withFeedback(
      () =>
        updateThresholdFn({
          data: { minPendingItems: parsed },
        }),
      'Threshold updated.',
    )
  }

  async function onFulfill() {
    if (!isOrderer) {
      return
    }

    const result = await withFeedback(
      () => fulfillCurrentListFn(),
      'Order fulfilled! List cleared.',
    )

    if (!result) {
      return
    }

    setIsScattering(true)
    setTimeout(() => setIsScattering(false), 500)
  }

  async function onDismissNotification(notificationId: number) {
    await withFeedback(
      () =>
        markNotificationReadFn({
          data: { notificationId },
        }),
      undefined,
    )
  }

  async function onSignOut() {
    await logoutFn()
    await navigate({ to: '/login' })
  }

  const onListItemIds = useMemo(
    () => new Set(data.currentList.map((entry) => entry.itemId)),
    [data.currentList],
  )

  const availableItems = useMemo(
    () => data.items.filter((item) => !onListItemIds.has(item.id)),
    [data.items, onListItemIds],
  )

  const thresholdProgress =
    data.threshold.minPendingItems > 0
      ? data.threshold.currentDistinctItems / data.threshold.minPendingItems
      : 0

  const thresholdLabel = `${data.threshold.currentDistinctItems} of ${data.threshold.minPendingItems} items`

  return (
    <div className={styles.page}>
      {/* ── Sticky top bar ── */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <h1 className={styles.brandName}>SLOP</h1>
          <p className={styles.brandTag}>Shopping List Ordering Platform</p>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.userChip}>
            {currentUser.email}
            <span className={styles.roleBadge}>{currentUser.role}</span>
          </span>
          <button className={styles.signOutBtn} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Search strip ── */}
      <div className={styles.searchStrip}>
        <div className={styles.searchInner}>
          <Omnisearch
            items={availableItems}
            canCreate={isOrderer}
            onAddExisting={onAddRequest}
            onCreateItem={onCreateFromSearch}
          />
        </div>
      </div>

      {/* ── Feedback messages ── */}
      {(errorMessage || infoMessage) && (
        <div className={styles.feedback}>
          {errorMessage ? (
            <p className={styles.error}>{errorMessage}</p>
          ) : null}
          {infoMessage ? <p className={styles.info}>{infoMessage}</p> : null}
        </div>
      )}

      {/* ── Main content area ── */}
      <main className={styles.main}>
        <div className={styles.canvas}>
          <CentralList
            entries={data.currentList}
            thresholdLabel={thresholdLabel}
            thresholdProgress={thresholdProgress}
            canFulfill={isOrderer}
            onCancel={onCancelRequest}
            onDropAdd={onAddRequest}
            onFulfill={onFulfill}
            isScattering={isScattering}
          />

          <section className={styles.productsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Products</h2>
              <span className={styles.sectionCount}>
                {availableItems.length} available
              </span>
            </div>
            <div
              className={[
                styles.productGrid,
                isScattering ? styles.productScatter : '',
              ].join(' ')}
            >
              {availableItems.map((item) => (
                <ProductCard key={item.id} item={item} onAdd={onAddRequest} />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ── Admin panel (orderer only) ── */}
      {isOrderer ? (
        <div className={styles.adminPanel}>
          <hr className={styles.adminDivider} />
          <div className={styles.adminGrid}>
            {/* Notifications */}
            <div className={styles.adminCard}>
              <div className={styles.adminCardHeader}>
                <h2 className={styles.adminCardTitle}>Notifications</h2>
              </div>
              <div style={{ padding: 0 }}>
                <NotificationTray
                  notifications={data.notifications}
                  onDismiss={onDismissNotification}
                />
              </div>
            </div>

            {/* Catalog management */}
            <div className={styles.adminCard}>
              <div className={styles.adminCardHeader}>
                <h2 className={styles.adminCardTitle}>Catalog</h2>
              </div>
              <div className={styles.adminCardBody}>
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
                    Staple
                  </label>
                  <Button onClick={onCreateItem} size="small">
                    Save
                  </Button>
                </div>
                <ul className={styles.itemsList}>
                  {data.items.map((item) => (
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

            {/* Threshold */}
            <div className={styles.adminCard}>
              <div className={styles.adminCardHeader}>
                <h2 className={styles.adminCardTitle}>Fulfillment Threshold</h2>
              </div>
              <div className={styles.adminCardBody}>
                <p style={{ margin: 0, fontSize: 'var(--fontSizeSm)', color: 'var(--colorTextMuted)' }}>
                  Notify orderer when distinct items on the list reach this number.
                </p>
                <div className={styles.thresholdForm}>
                  <div className={styles.thresholdField}>
                    <Input
                      type="number"
                      min={1}
                      value={thresholdInput}
                      onChange={(event) => setThresholdInput(event.target.value)}
                    />
                  </div>
                  <Button onClick={onUpdateThreshold} size="small">
                    Update
                  </Button>
                </div>
              </div>
            </div>

            {/* Past orders */}
            <div className={styles.adminCard}>
              <div className={styles.adminCardHeader}>
                <h2 className={styles.adminCardTitle}>Order History</h2>
              </div>
              {data.pastFulfillments.length ? (
                <ul className={styles.historyList}>
                  {data.pastFulfillments.map((fulfillment) => (
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
