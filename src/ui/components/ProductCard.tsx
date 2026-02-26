import { Button } from '@/ui/elements/Button'

import styles from './ProductCard.module.css'

type ProductCardProps = {
  item: {
    id: number
    name: string
    category: string
    isEvergreen: boolean
  }
  onAdd: (itemId: number) => void | Promise<void>
}

export function ProductCard({ item, onAdd }: ProductCardProps) {
  function onDragStart(event: React.DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('text/slop-item-id', String(item.id))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <article className={styles.card} draggable onDragStart={onDragStart}>
      <div className={styles.iconArea}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{item.name}</h3>
        <p className={styles.category}>{item.category}</p>
      </div>
      <div className={styles.footer}>
        {item.isEvergreen ? (
          <span className={styles.badge}>Staple</span>
        ) : (
          <span />
        )}
        <Button
          className={styles.addBtn}
          onClick={() => onAdd(item.id)}
          variant="green"
          size="small"
        >
          ADD
        </Button>
      </div>
    </article>
  )
}
