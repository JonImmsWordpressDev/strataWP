/** A usage or file problem; the CLI turns it into exit code 2. */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReviewError'
  }
}
