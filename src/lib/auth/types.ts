export type UserRole = 'orderer' | 'colleague'

export type SessionUser = {
  id: number
  email: string
  role: UserRole
}
