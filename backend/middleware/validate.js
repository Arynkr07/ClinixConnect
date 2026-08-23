import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs express-validator checks and throws a 400 with per-field details
 * if any validation rule fails. Must be placed AFTER the validators.
 */
export const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().reduce((acc, error) => {
    const field = error.path || error.param;
    acc[field] = acc[field] ? [...acc[field], error.msg] : [error.msg];
    return acc;
  }, {});

  return next(new ApiError(400, 'Validation failed', details));
};

export default validate;
