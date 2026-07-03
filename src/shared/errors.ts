export class NotFoundError extends Error {
  constructor(readonly resource: string) {
    super();
  }
}

export class BulkOperationError extends Error {
  constructor(readonly errors: Record<string, Error>) {
    super();
  }
}
