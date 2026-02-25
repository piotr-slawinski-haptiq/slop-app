import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { requestMagicLinkFn, getCurrentUserFn } from '@/lib/server-fns/auth.functions'
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
        'Magic link sent. Check your email and click the link to continue.',
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
      <section className={styles.card}>
        <h1 className={styles.title}>Sign in to SLOP</h1>
        <p className={styles.subtitle}>
          Use your @haptiq.com email to request a secure magic link.
        </p>
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@haptiq.com"
            required
            autoComplete="email"
          />
          <div className={styles.actions}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send magic link'}
            </Button>
          </div>
        </form>
        <p className={styles.hint}>
          Only users in the allowed domain can authenticate.
        </p>
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        {statusMessage ? <p className={styles.success}>{statusMessage}</p> : null}
        {previewUrl ? (
          <p className={styles.success}>
            Dev preview link:{' '}
            <a href={previewUrl} className={styles.previewLink}>
              {previewUrl}
            </a>
          </p>
        ) : null}
      </section>
    </main>
  )
}
