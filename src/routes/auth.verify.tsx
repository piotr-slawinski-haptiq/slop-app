import { createFileRoute, redirect } from '@tanstack/react-router'

import { verifyMagicLinkFn } from '@/lib/server-fns/auth.functions'

export const Route = createFileRoute('/auth/verify')({
  validateSearch: (search) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  loader: async ({ search }) => {
    try {
      await verifyMagicLinkFn({
        data: {
          token: search.token,
        },
      })
    } catch {
      throw redirect({ to: '/login' })
    }

    throw redirect({ to: '/' })
  },
  component: VerifyRouteComponent,
})

function VerifyRouteComponent() {
  return <p>Verifying magic link…</p>
}
