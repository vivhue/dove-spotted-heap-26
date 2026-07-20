// Error carrying an HTTP status so handlers can surface readable messages to the
// client instead of a blanket 500.
class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = { HttpError };
