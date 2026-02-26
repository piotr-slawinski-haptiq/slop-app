import styles from './Button.module.css'

import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'green'
type ButtonSize = 'small' | 'medium'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantMap: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  green: styles.green,
}

export function Button({
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    variantMap[variant],
    size === 'small' ? styles.sizeSmall : styles.sizeMedium,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} {...props} />
}
