import { setResponseStatus } from '@tanstack/react-start/server'

import { HttpError } from '@/lib/http-error'

export async function withHttpStatus<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof HttpError) {
      setResponseStatus(error.statusCode, error.message)
    }
    throw error
  }
}
