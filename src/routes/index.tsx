import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

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
      setInfoMessage('Item already exists on the shared list.')
      return
    }

    if (result.trigger === 'immediate') {
      setInfoMessage('Staple added - order now notification sent.')
    } else if (result.trigger === 'threshold') {
      setInfoMessage('Threshold reached - place order notification sent.')
    } else {
      setInfoMessage('Item added to the shared list.')
    }
  }

  async function onCancelRequest(requestId: number) {
    await withFeedback(
      () =>
        cancelRequestFn({
          data: { requestId },
        }),
      'Request removed from the list.',
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
      'Catalog item deleted.',
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
      'List fulfilled and moved to order history.',
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

  const thresholdLabel = `${data.threshold.currentDistinctItems} / ${data.threshold.minPendingItems} items · ${data.threshold.remainingUntilThreshold} until threshold`

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>SLOP</h1>
          <p className={styles.subTitle}>
            Shopping List Ordering Platform · single shared office list
          </p>
        </div>
        <div className={styles.inlineForm}>
          <span className={styles.chip}>
            {currentUser.email} · {currentUser.role}
          </span>
          <Button onClick={onSignOut} variant="secondary">
            Sign out
          </Button>
        </div>
      </header>

      <Omnisearch
        items={data.items}
        canCreate={isOrderer}
        onAddExisting={onAddRequest}
        onCreateItem={onCreateFromSearch}
      />

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {infoMessage ? <p>{infoMessage}</p> : null}

      <section className={styles.canvas}>
        <CentralList
          entries={data.currentList}
          thresholdLabel={thresholdLabel}
          canFulfill={isOrderer}
          onCancel={onCancelRequest}
          onDropAdd={onAddRequest}
          onFulfill={onFulfill}
          isScattering={isScattering}
        />

        <section className={styles.productsSection}>
          <h2 className={styles.sectionHeading}>Product cards</h2>
          <div
            className={[
              styles.productGrid,
              isScattering ? styles.productScatter : '',
            ].join(' ')}
          >
            {data.items.map((item) => (
              <ProductCard key={item.id} item={item} onAdd={onAddRequest} />
            ))}
          </div>
        </section>
      </section>

      {isOrderer ? (
        <section className={styles.adminPanel}>
          <div className={styles.adminColumns}>
            <section className={styles.adminSection}>
              <h2 className={styles.adminTitle}>Notifications</h2>
              <NotificationTray
                notifications={data.notifications}
                onDismiss={onDismissNotification}
              />
            </section>

            <section className={styles.adminSection}>
              <h2 className={styles.adminTitle}>Catalog management</h2>
              <div className={styles.inlineForm}>
                <Input
                  value={itemName}
                  placeholder="New item name"
                  onChange={(event) => setItemName(event.target.value)}
                />
                <Input
                  value={itemCategory}
                  placeholder="Category"
                  onChange={(event) => setItemCategory(event.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={isEvergreen}
                    onChange={(event) => setIsEvergreen(event.target.checked)}
                  />{' '}
                  Staple
                </label>
                <Button onClick={onCreateItem}>Save item</Button>
              </div>
              <ul className={styles.itemsList}>
                {data.items.map((item) => (
                  <li key={item.id} className={styles.itemRow}>
                    <span>
                      {item.name} · {item.category}{' '}
                      {item.isEvergreen ? '(Staple)' : ''}
                    </span>
                    <div className={styles.inlineForm}>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => onToggleEvergreen(item)}
                      >
                        Toggle staple
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
            </section>

            <section className={styles.adminSection}>
              <h2 className={styles.adminTitle}>Threshold</h2>
              <div className={styles.inlineForm}>
                <Input
                  type="number"
                  min={1}
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                />
                <Button onClick={onUpdateThreshold}>Update threshold</Button>
              </div>
            </section>

            <section className={styles.adminSection}>
              <h2 className={styles.adminTitle}>Past orders</h2>
              {data.pastFulfillments.length ? (
                <ul className={styles.historyList}>
                  {data.pastFulfillments.map((fulfillment) => (
                    <li key={fulfillment.id} className={styles.historyRow}>
                      <p className={styles.historyTitle}>
                        Fulfillment #{fulfillment.id}
                      </p>
                      <p className={styles.historyMeta}>
                        Trigger: {fulfillment.trigger} · Fulfilled at:{' '}
                        {formatDate(fulfillment.fulfilledAt)}
                      </p>
                      <p className={styles.historyMeta}>
                        Items:{' '}
                        {fulfillment.requests
                          .map((request) => request.itemName)
                          .join(', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.historyMeta}>No past fulfillments yet.</p>
              )}
            </section>
          </div>
        </section>
      ) : null}
    </main>
  )
}
