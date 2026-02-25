import styles from './Button.module.css'

import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'small' | 'medium'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : variant === 'danger'
          ? styles.danger
          : styles.ghost

  const sizeClass = size === 'small' ? styles.sizeSmall : styles.sizeMedium

  const classes = [styles.button, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} {...props} />
}
