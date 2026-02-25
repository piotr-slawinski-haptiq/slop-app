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
      <div className={styles.header}>
        <h3 className={styles.name}>{item.name}</h3>
        {item.isEvergreen ? <span className={styles.badge}>Staple</span> : null}
      </div>
      <p className={styles.category}>{item.category}</p>
      <Button onClick={() => onAdd(item.id)} size="small">
        Add to list
      </Button>
    </article>
  )
}
