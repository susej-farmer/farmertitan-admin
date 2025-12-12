/**
 * Environment Manager
 *
 * Centralized environment configuration and management.
 * This is the SINGLE source of truth for environment handling.
 *
 * Key responsibilities:
 * - Store environment configuration from .env
 * - Validate environment values
 * - Provide environment metadata
 * - Default to 'local' if no environment specified
 */

const { AsyncLocalStorage } = require('async_hooks');

// AsyncLocalStorage to store request-scoped context
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Environment configurations loaded from .env
 */
const environments = {
  local: {
    name: 'local',
    supabase: {
      url: process.env.SUPABASE_URL_LOCAL || process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_ANON_KEY_LOCAL || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_LOCAL || process.env.SUPABASE_SERVICE_KEY
    }
  },

  development: {
    name: 'development',
    supabase: {
      url: process.env.SUPABASE_URL_DEV || process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY_DEV || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_DEV || process.env.SUPABASE_SERVICE_KEY
    }
  },

  production: {
    name: 'production',
    supabase: {
      url: process.env.SUPABASE_URL_PROD || process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY_PROD || process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY_PROD || process.env.SUPABASE_SERVICE_KEY
    }
  }
};

/**
 * Default environment when X-Environment header is not provided
 */
const DEFAULT_ENVIRONMENT = 'local';

/**
 * Valid environment names
 */
const VALID_ENVIRONMENTS = Object.keys(environments);

class EnvironmentManager {
  /**
   * Get environment configuration by name
   * @param {string} environmentName - Environment name (local, development, production)
   * @returns {object} Environment configuration
   */
  static getEnvironmentConfig(environmentName = DEFAULT_ENVIRONMENT) {
    const normalized = environmentName.toLowerCase().trim();

    if (!VALID_ENVIRONMENTS.includes(normalized)) {
      console.warn(
        `Invalid environment "${environmentName}". Valid values: ${VALID_ENVIRONMENTS.join(', ')}. ` +
        `Defaulting to "${DEFAULT_ENVIRONMENT}".`
      );
      return environments[DEFAULT_ENVIRONMENT];
    }

    const config = environments[normalized];

    // Validate configuration
    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error(
        `Missing required Supabase configuration for environment: ${normalized}. ` +
        `Check your .env file for SUPABASE_URL and SUPABASE_SERVICE_KEY variables.`
      );
    }

    return config;
  }

  /**
   * Get current environment from AsyncLocalStorage context
   * Falls back to default if no context is set
   * @returns {string} Current environment name
   */
  static getCurrentEnvironment() {
    const store = asyncLocalStorage.getStore();
    return store?.environment || DEFAULT_ENVIRONMENT;
  }

  /**
   * Get current environment configuration from context
   * @returns {object} Current environment configuration
   */
  static getCurrentConfig() {
    const environmentName = this.getCurrentEnvironment();
    return this.getEnvironmentConfig(environmentName);
  }

  /**
   * Set environment context for the current async scope
   * This should only be called by middleware
   * @param {string} environment - Environment name
   * @param {Function} callback - Function to run with this context
   */
  static runWithEnvironment(environment, callback) {
    const config = this.getEnvironmentConfig(environment);
    return asyncLocalStorage.run({ environment: config.name, config }, callback);
  }

  /**
   * Get the AsyncLocalStorage instance (for middleware use)
   * @returns {AsyncLocalStorage} The storage instance
   */
  static getAsyncLocalStorage() {
    return asyncLocalStorage;
  }

  /**
   * Get all available environments
   * @returns {string[]} Array of environment names
   */
  static getAvailableEnvironments() {
    return VALID_ENVIRONMENTS;
  }

  /**
   * Get default environment
   * @returns {string} Default environment name
   */
  static getDefaultEnvironment() {
    return DEFAULT_ENVIRONMENT;
  }

  /**
   * Validate that an environment has all required configuration
   * @param {string} environment - Environment to validate
   * @returns {boolean} True if valid
   * @throws {Error} If configuration is missing or invalid
   */
  static validateEnvironment(environment) {
    const config = this.getEnvironmentConfig(environment);

    const errors = [];

    if (!config.supabase.url) {
      errors.push(`SUPABASE_URL for ${environment}`);
    }

    if (!config.supabase.serviceKey) {
      errors.push(`SUPABASE_SERVICE_KEY for ${environment}`);
    }

    if (errors.length > 0) {
      throw new Error(
        `Missing required configuration for ${environment}: ${errors.join(', ')}`
      );
    }

    return true;
  }
}

module.exports = EnvironmentManager;
