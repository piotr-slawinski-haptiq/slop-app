export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export function asHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error
  }

  return new HttpError(500, 'Unexpected server error')
}
