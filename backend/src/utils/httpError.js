export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function sendError(res, err) {
  if (err instanceof HttpError) {
    const body = { success: false, message: err.message };
    if (process.env.NODE_ENV !== 'production' && err.details != null) {
      body.details = err.details;
    }
    return res.status(err.status).json(body);
  }
  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
