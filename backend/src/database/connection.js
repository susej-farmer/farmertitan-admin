const { createClient } = require('@supabase/supabase-js');
const EnvironmentManager = require('../config/environmentManager');

class DatabaseConnection {
  constructor() {
    this.defaultClient = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Initialize default Supabase client (local environment)
      const defaultConfig = EnvironmentManager.getEnvironmentConfig('local');

      this.defaultClient = createClient(
        defaultConfig.supabase.url,
        defaultConfig.supabase.serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Test the connection
      const { data, error } = await this.defaultClient
        .from('_equipment_type')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      this.isConnected = true;
      console.log('Supabase connection initialized successfully (default: local)');

      return this.defaultClient;
    } catch (error) {
      this.isConnected = false;
      console.error('Failed to initialize Supabase connection', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.supabase) {
      throw new Error('Database not initialized. Supabase client is null.');
    }
    
    const start = Date.now();
    
    try {
      // This is a placeholder - actual queries will be handled by specific clients
      // using Supabase's query methods (.select(), .insert(), .update(), .delete())
      throw new Error('Direct SQL queries not supported with Supabase client. Use specific client methods.');
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Database query failed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params.length,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Supabase client for current request context
   * Uses EnvironmentManager to determine the correct environment
   * @returns {Object} Supabase client instance for current environment
   */
  getClient() {
    // Get current environment configuration from AsyncLocalStorage context
    const config = EnvironmentManager.getCurrentConfig();

    // Create client for current environment
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

  async healthCheck() {
    try {
      const client = this.defaultClient || this.getClient();
      const { data, error } = await client
        .from('_equipment_type')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return {
        healthy: true,
        timestamp: new Date().toISOString(),
        connected: this.isConnected,
        environment: EnvironmentManager.getCurrentEnvironment()
      };
    } catch (error) {
      console.error('Database health check failed', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        connected: false
      };
    }
  }

  async close() {
    if (this.defaultClient) {
      this.isConnected = false;
      console.log('Supabase connection closed');
    }
  }

  getStats() {
    return {
      connected: this.isConnected,
      client: this.defaultClient ? 'supabase' : null,
      environment: EnvironmentManager.getCurrentEnvironment()
    };
  }
}

// Create a singleton instance
const dbConnection = new DatabaseConnection();

// Initialize the connection immediately
dbConnection.initialize().catch(error => {
  console.error('Failed to initialize database connection:', error.message);
});

module.exports = dbConnection;