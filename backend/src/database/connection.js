const { createClient } = require('@supabase/supabase-js');

class DatabaseConnection {
  constructor() {
    this.supabase = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Initialize Supabase client
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Test the connection
      const { data, error } = await this.supabase
        .from('equipment_types')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      this.isConnected = true;
      console.log('Supabase connection initialized successfully', {
        url: process.env.SUPABASE_URL,
        connected: true
      });

      return this.supabase;
    } catch (error) {
      this.isConnected = false;
      console.error('Failed to initialize Supabase connection', {
        error: error.message,
        stack: error.stack,
        config: {
          url: process.env.SUPABASE_URL
        }
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

  getClient() {
    if (!this.supabase) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.supabase;
  }

  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('equipment_types')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return {
        healthy: true,
        timestamp: new Date().toISOString(),
        connected: this.isConnected
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
    if (this.supabase) {
      this.isConnected = false;
      console.log('Supabase connection closed');
    }
  }

  getStats() {
    return {
      connected: this.isConnected,
      client: this.supabase ? 'supabase' : null
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