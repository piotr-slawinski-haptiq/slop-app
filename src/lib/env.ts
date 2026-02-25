const defaultAllowedDomain = 'haptiq.com'

export const env = {
  allowedEmailDomain:
    process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() ??
    defaultAllowedDomain,
  appUrl: process.env.APP_URL?.trim() ?? 'http://localhost:3000',
  sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() ?? 'slop_session',
  sessionDurationDays: Number(process.env.SESSION_DURATION_DAYS ?? '30'),
  magicLinkDurationMinutes: Number(process.env.MAGIC_LINK_DURATION_MINUTES ?? '15'),
  magicLinkSecret: process.env.MAGIC_LINK_SECRET?.trim() ?? 'dev-magic-link-secret',
  emailFrom: process.env.EMAIL_FROM?.trim() ?? '',
  smtpUrl: process.env.SMTP_URL?.trim() ?? '',
  ordererEmails: (process.env.ORDERER_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${env.allowedEmailDomain}`)
}
