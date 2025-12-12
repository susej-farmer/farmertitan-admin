/**
 * Environment Selection Middleware
 *
 * This middleware reads the X-Environment header from incoming requests
 * and sets up the AsyncLocalStorage context for the current request.
 *
 * Supported environments:
 * - local (default)
 * - development
 * - production
 */

const EnvironmentManager = require('../config/environmentManager');

/**
 * Middleware to set environment context based on X-Environment header
 * Uses AsyncLocalStorage to maintain request-scoped environment context
 */
const setEnvironment = (req, res, next) => {
  try {
    // Read environment from header
    const headerEnvironment = req.headers['x-environment'];

    // Default to local if not specified
    const environment = headerEnvironment
      ? headerEnvironment.toLowerCase().trim()
      : EnvironmentManager.getDefaultEnvironment();

    // Validate and get environment configuration
    const validEnvironments = EnvironmentManager.getAvailableEnvironments();

    if (headerEnvironment && !validEnvironments.includes(environment)) {
      console.warn(
        `Invalid X-Environment header value: "${headerEnvironment}". ` +
        `Valid values are: ${validEnvironments.join(', ')}. ` +
        `Defaulting to "${EnvironmentManager.getDefaultEnvironment()}".`
      );
    }

    // Log environment selection (useful for debugging)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Environment] Request using: ${environment}`);
    }

    // Run the rest of the request handling within the environment context
    // This sets up AsyncLocalStorage for the current request
    EnvironmentManager.runWithEnvironment(environment, () => {
      next();
    });
  } catch (error) {
    console.error('Error in environment middleware:', error);

    // Don't fail the request, use default environment
    const defaultEnv = EnvironmentManager.getDefaultEnvironment();
    console.log(`[Environment] Falling back to: ${defaultEnv}`);

    EnvironmentManager.runWithEnvironment(defaultEnv, () => {
      next();
    });
  }
};

/**
 * Middleware to require a specific environment
 * @param {string|string[]} allowedEnvironments - Environment(s) allowed for this route
 */
const requireEnvironment = (allowedEnvironments) => {
  const allowed = Array.isArray(allowedEnvironments) ? allowedEnvironments : [allowedEnvironments];

  return (req, res, next) => {
    const currentEnv = req.environment || 'local';

    if (!allowed.includes(currentEnv)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ENVIRONMENT_NOT_ALLOWED',
          message: `This operation is not allowed in ${currentEnv} environment`,
          allowedEnvironments: allowed,
          currentEnvironment: currentEnv
        }
      });
    }

    next();
  };
};

/**
 * Middleware to log environment information
 */
const logEnvironment = (req, res, next) => {
  console.log('='.repeat(80));
  console.log(`Environment: ${req.environment || 'not set'}`);
  console.log(`Route: ${req.method} ${req.path}`);
  console.log(`Supabase URL: ${req.dbConfig?.supabase?.url || 'not set'}`);
  console.log('='.repeat(80));
  next();
};

module.exports = {
  setEnvironment,
  requireEnvironment,
  logEnvironment
};
