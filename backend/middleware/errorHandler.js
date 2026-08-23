import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.entries(err.errors).reduce((acc, [field, e]) => {
      acc[field] = e.message;
      return acc;
    }, {});
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.kind || 'value'} for ${err.path || 'field'}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}. A record with this value already exists.`;
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  const body = {
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  if (env.IS_DEV && statusCode >= 500) {
    body.stack = err.stack;
  }

  // Only log 5xx (and unexpected 4xx) to avoid noisy logs for client errors
  if (statusCode >= 500 || !err.isOperational) {
    console.error('[error]', err);
  }

  res.status(statusCode).json(body);
};

export { notFoundHandler, errorHandler };
export default errorHandler;
