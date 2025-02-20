export class NotFoundError extends Error {
  constructor(readonly resource: string) {
    super();
  }
}
