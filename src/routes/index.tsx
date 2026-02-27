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
import { AdminModal } from '@/ui/components/AdminModal'
import { CentralList } from '@/ui/components/CentralList'
import { NotificationStrip } from '@/ui/components/NotificationStrip'
import { Omnisearch } from '@/ui/components/Omnisearch'
import { ProductCard } from '@/ui/components/ProductCard'
import {
  ToastContainer,
  useToasts,
} from '@/ui/components/ToastContainer'

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

function DashboardPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  const { toasts, showSuccess, showError, removeToast } = useToasts()
  const [isScattering, setIsScattering] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)

  const currentUser = data.currentUser
  const isOrderer = currentUser.role === 'orderer'

  async function refreshData() {
    await router.invalidate()
  }

  async function withFeedback<T>(
    action: () => Promise<T>,
    successMessage?: string,
  ): Promise<T | null> {
    try {
      const result = await action()
      if (successMessage) {
        showSuccess(successMessage)
      }
      await refreshData()
      return result
    } catch (error) {
      showError(formatError(error))
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
      showSuccess('Item already on the list.')
      return
    }

    if (result.trigger === 'immediate') {
      showSuccess('Staple item added — order notification sent!')
    } else if (result.trigger === 'threshold') {
      showSuccess('Threshold reached — time to place an order!')
    } else {
      showSuccess('Item added to the list.')
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

  async function onCreateItem(data: {
    name: string
    category: string
    isEvergreen: boolean
  }) {
    await withFeedback(
      async () => {
        await upsertItemFn({ data })
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

  async function onUpdateThreshold(minPendingItems: number) {
    await withFeedback(
      () =>
        updateThresholdFn({
          data: { minPendingItems },
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
          {isOrderer && (
            <button
              className={styles.adminBtn}
              onClick={() => setIsAdminModalOpen(true)}
            >
              ⚙️ Admin
            </button>
          )}
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

      {/* ── Notification strip (orderer only) ── */}
      {isOrderer && data.notifications.length > 0 && (
        <NotificationStrip
          notifications={data.notifications}
          onDismiss={onDismissNotification}
        />
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

      {/* ── Admin modal (orderer only) ── */}
      {isOrderer && (
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          items={data.items}
          pastFulfillments={data.pastFulfillments}
          currentThreshold={data.threshold.minPendingItems}
          onCreateItem={onCreateItem}
          onDeleteItem={onDeleteItem}
          onToggleEvergreen={onToggleEvergreen}
          onUpdateThreshold={onUpdateThreshold}
        />
      )}

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
