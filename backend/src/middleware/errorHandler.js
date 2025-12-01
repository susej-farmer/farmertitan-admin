const logger = require('../database/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  logger.api.error(req, err, err.statusCode || 500);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details = null;

  // Operational errors (known/expected errors)
  if (err.isOperational) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'OPERATIONAL_ERROR';
    details = err.details;
  }
  
  // PostgreSQL errors
  else if (err.code) {
    ({ statusCode, message, code, details } = handleDatabaseError(err));
  }
  
  // Joi validation errors
  else if (err.isJoi) {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
  }
  
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }
  
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  
  // Syntax errors in JSON
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON syntax';
    code = 'INVALID_JSON';
  }
  
  // Cast errors
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data type';
    code = 'CAST_ERROR';
    details = { field: err.path, value: err.value };
  }

  // Build clean response (never include stack trace for security)
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    }
  };

  res.status(statusCode).json(response);
};

const handleDatabaseError = (err) => {
  let statusCode = 500;
  let message = 'Database error';
  let code = 'DATABASE_ERROR';
  let details = null;

  switch (err.code) {
    case '23505': // Unique violation
      statusCode = 409;
      message = 'Resource already exists';
      code = 'DUPLICATE_RESOURCE';
      details = {
        constraint: err.constraint,
        detail: err.detail
      };
      break;

    case '23503': // Foreign key violation
      statusCode = 400;
      message = 'Invalid reference to related resource';
      code = 'FOREIGN_KEY_VIOLATION';
      details = {
        constraint: err.constraint,
        detail: err.detail
      };
      break;

    case '23502': // Not null violation
      statusCode = 400;
      message = 'Required field is missing';
      code = 'MISSING_REQUIRED_FIELD';
      details = {
        column: err.column,
        table: err.table
      };
      break;

    case '22001': // String data right truncation
      statusCode = 400;
      message = 'Data too long for field';
      code = 'DATA_TOO_LONG';
      break;

    case '22P02': // Invalid text representation
      statusCode = 400;
      message = 'Invalid data format';
      code = 'INVALID_DATA_FORMAT';
      break;

    case '42P01': // Undefined table
      statusCode = 500;
      message = 'Database schema error';
      code = 'SCHEMA_ERROR';
      break;

    case '42703': // Undefined column
      statusCode = 500;
      message = 'Database schema error';
      code = 'SCHEMA_ERROR';
      break;

    case 'ECONNREFUSED':
      statusCode = 503;
      message = 'Database connection failed';
      code = 'DATABASE_UNAVAILABLE';
      break;

    case 'ENOTFOUND':
      statusCode = 503;
      message = 'Database server not found';
      code = 'DATABASE_UNAVAILABLE';
      break;

    case 'ETIMEDOUT':
      statusCode = 504;
      message = 'Database operation timed out';
      code = 'DATABASE_TIMEOUT';
      break;

    default:
      // Log unknown database errors for investigation
      console.error('Unknown database error', {
        code: err.code,
        message: err.message,
        detail: err.detail,
        stack: err.stack
      });
  }

  return { statusCode, message, code, details };
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl
    }
  );
  next(error);
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFoundHandler
};