/**
 * Database Configuration for Multiple Environments
 *
 * This file manages database connections for:
 * - local: Local development environment
 * - development: Development/staging environment
 * - production: Production environment
 *
 * The environment is selected via the X-Environment header in each request
 */

const environments = {
  local: {
    supabase: {
      url: process.env.SUPABASE_URL_LOCAL || process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_ANON_KEY_LOCAL || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_LOCAL || process.env.SUPABASE_SERVICE_KEY
    }
  },

  development: {
    supabase: {
      url: process.env.SUPABASE_URL_DEV || process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY_DEV || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_DEV || process.env.SUPABASE_SERVICE_KEY
    }
  },

  production: {
    supabase: {
      url: process.env.SUPABASE_URL_PROD || process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY_PROD || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_PROD || process.env.SUPABASE_SERVICE_KEY
    }
  }
};

/**
 * Get database configuration for a specific environment
 * @param {string} environment - Environment name (local, development, production)
 * @returns {object} Database configuration
 */
function getDatabaseConfig(environment = 'local') {
  const validEnvironments = ['local', 'development', 'production'];

  // Validate environment
  if (!validEnvironments.includes(environment)) {
    console.warn(`Invalid environment "${environment}". Defaulting to "local".`);
    return environments.local;
  }

  const config = environments[environment];

  // Validate configuration
  if (!config.supabase.url || !config.supabase.serviceKey) {
    throw new Error(`Missing required Supabase configuration for environment: ${environment}`);
  }

  return config;
}

/**
 * Get all available environments
 * @returns {string[]} Array of environment names
 */
function getAvailableEnvironments() {
  return Object.keys(environments);
}

/**
 * Validate that required environment variables are set
 * @param {string} environment - Environment to validate
 * @returns {boolean} True if valid, throws error otherwise
 */
function validateEnvironmentConfig(environment) {
  const config = environments[environment];

  if (!config) {
    throw new Error(`Environment "${environment}" not found in configuration`);
  }

  const errors = [];

  if (!config.supabase.url) {
    errors.push(`SUPABASE_URL for ${environment}`);
  }

  if (!config.supabase.serviceKey) {
    errors.push(`SUPABASE_SERVICE_KEY for ${environment}`);
  }

  if (errors.length > 0) {
    throw new Error(`Missing required configuration for ${environment}: ${errors.join(', ')}`);
  }

  return true;
}

module.exports = {
  environments,
  getDatabaseConfig,
  getAvailableEnvironments,
  validateEnvironmentConfig
};
