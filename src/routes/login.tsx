import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import {
  requestMagicLinkFn,
  getCurrentUserFn,
} from '@/lib/server-fns/auth.functions'
import { Button } from '@/ui/elements/Button'
import { Input } from '@/ui/elements/Input'

import styles from './login.module.css'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to send magic link. Please try again.'
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')
    setPreviewUrl(null)
    setIsSubmitting(true)

    try {
      const result = await requestMagicLinkFn({
        data: {
          email,
        },
      })

      setStatusMessage(
        'Magic link sent! Check your email and click the link to sign in.',
      )
      setPreviewUrl(result.previewUrl)
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.brandBar}>
        <h1 className={styles.brandTitle}>SLOP</h1>
        <p className={styles.brandSub}>Shopping List Ordering Platform</p>
      </div>

      <div className={styles.content}>
        <section className={styles.card}>
          <div>
            <h2 className={styles.title}>Sign in</h2>
            <p className={styles.subtitle}>
              Enter your @haptiq.com email to receive a secure magic link.
            </p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Email address
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@haptiq.com"
                required
                autoComplete="email"
              />
            </label>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>

          <p className={styles.hint}>
            Only @haptiq.com email addresses are allowed to sign in.
          </p>

          {errorMessage ? (
            <p className={styles.error}>{errorMessage}</p>
          ) : null}
          {statusMessage ? (
            <p className={styles.success}>{statusMessage}</p>
          ) : null}
          {previewUrl ? (
            <p className={styles.success}>
              Dev preview:{' '}
              <a href={previewUrl} className={styles.previewLink}>
                Click here to verify
              </a>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}
