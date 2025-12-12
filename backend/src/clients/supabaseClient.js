/**
 * Dynamic Supabase Client
 *
 * This client creates Supabase connections based on the environment
 * specified in the request (via X-Environment header)
 */

const { createClient } = require('@supabase/supabase-js');
const { getDatabaseConfig } = require('../config/database');

/**
 * Create a Supabase client for a specific request
 * Uses the dbConfig attached by the environment middleware
 *
 * @param {object} req - Express request object (must have req.dbConfig)
 * @returns {object} Supabase client instance
 */
function getSupabaseClient(req) {
  if (!req || !req.dbConfig) {
    console.warn('No dbConfig found in request. Falling back to default environment.');
    const defaultConfig = getDatabaseConfig('local');
    return createClient(
      defaultConfig.supabase.url,
      defaultConfig.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  const { supabase } = req.dbConfig;

  return createClient(
    supabase.url,
    supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Create a Supabase client for a specific environment
 * Use this when you don't have a request object
 *
 * @param {string} environment - Environment name (local, development, production)
 * @returns {object} Supabase client instance
 */
function getSupabaseClientForEnvironment(environment = 'local') {
  const config = getDatabaseConfig(environment);

  return createClient(
    config.supabase.url,
    config.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Create an anonymous Supabase client (using anon key instead of service key)
 *
 * @param {object} req - Express request object
 * @returns {object} Supabase client instance with anon key
 */
function getAnonSupabaseClient(req) {
  if (!req || !req.dbConfig) {
    console.warn('No dbConfig found in request. Falling back to default environment.');
    const defaultConfig = getDatabaseConfig('local');
    return createClient(
      defaultConfig.supabase.url,
      defaultConfig.supabase.anonKey
    );
  }

  const { supabase } = req.dbConfig;

  return createClient(
    supabase.url,
    supabase.anonKey
  );
}

module.exports = {
  getSupabaseClient,
  getSupabaseClientForEnvironment,
  getAnonSupabaseClient
};
