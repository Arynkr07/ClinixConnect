export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createApiError = (statusCode, message, details) =>
  new ApiError(statusCode, message, details);

export default ApiError;
