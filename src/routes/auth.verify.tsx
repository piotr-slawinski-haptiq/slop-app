import { createFileRoute } from '@tanstack/react-router'

import { verifyMagicLink } from '@/lib/auth/magic-link.server'

import styles from './auth.verify.module.css'

function redirectResponse(to: string): Response {
  return new Response(null, {
    status: 307,
    headers: {
      location: to,
    },
  })
}

export const Route = createFileRoute('/auth/verify')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const token = url.searchParams.get('token') ?? ''

        if (!token) {
          return redirectResponse('/login')
        }

        try {
          await verifyMagicLink(token)
        } catch {
          return redirectResponse('/login')
        }

        return redirectResponse('/')
      },
    },
  },
  component: VerifyRouteComponent,
})

function VerifyRouteComponent() {
  return (
    <main className={styles.page}>
      <div className={styles.spinner} />
      <p className={styles.text}>Verifying your magic link…</p>
    </main>
  )
}
