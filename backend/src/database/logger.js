const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'farmertitan-admin-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let log = `${timestamp} [${service}] ${level}: ${message}`;
          
          // Add metadata if present
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          if (metaStr) {
            log += `\n${metaStr}`;
          }
          
          return log;
        })
      )
    }),
    
    // Write error logs to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Write all logs to file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
    new winston.transports.Console()
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
    new winston.transports.Console()
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Database specific logging functions
const dbLogger = {
  query: (query, params, duration, rowCount) => {
    logger.debug('Database Query', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      paramCount: params?.length || 0,
      duration: `${duration}ms`,
      rowCount,
      type: 'db_query'
    });
  },
  
  error: (operation, error, context = {}) => {
    logger.error('Database Error', {
      operation,
      error: error.message,
      stack: error.stack,
      ...context,
      type: 'db_error'
    });
  },
  
  connection: (event, details = {}) => {
    logger.info('Database Connection Event', {
      event,
      ...details,
      type: 'db_connection'
    });
  },
  
  transaction: (operation, details = {}) => {
    logger.debug('Database Transaction', {
      operation,
      ...details,
      type: 'db_transaction'
    });
  }
};

// API specific logging functions
const apiLogger = {
  request: (req, res, duration) => {
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      type: 'api_request'
    });
  },
  
  error: (req, error, statusCode = 500) => {
    logger.error('API Error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      error: error.message,
      stack: error.stack,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      type: 'api_error'
    });
  },
  
  validation: (req, errors) => {
    logger.warn('Validation Error', {
      method: req.method,
      url: req.originalUrl,
      errors,
      body: req.body,
      type: 'validation_error'
    });
  }
};

module.exports = {
  ...logger,
  db: dbLogger,
  api: apiLogger
};