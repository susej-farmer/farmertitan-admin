const { createClient } = require('@supabase/supabase-js');

class AuthClient {
  constructor() {
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
  }

  static async login(email, password) {
    const client = new AuthClient();
    
    try {
      const { data, error } = await client.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('Error in AuthClient.login:', error);
      throw error;
    }
  }

  static async verifyToken(token) {
    const client = new AuthClient();
    
    try {
      const { data: user, error } = await client.supabase.auth.getUser(token);
      
      if (error) {
        console.error('Token verification error:', error);
        throw error;
      }
      
      return user;
    } catch (error) {
      console.error('Error in AuthClient.verifyToken:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken) {
    const client = new AuthClient();
    
    try {
      const { data, error } = await client.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Token refresh error:', error);
        throw error;
      }
      
      return {
        session: data.session,
        user: data.user
      };
    } catch (error) {
      console.error('Error in AuthClient.refreshToken:', error);
      throw error;
    }
  }

  static async logout(token) {
    const client = new AuthClient();
    
    try {
      const { error } = await client.supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in AuthClient.logout:', error);
      throw error;
    }
  }

  static async createUser(email, password, userData = {}) {
    const client = new AuthClient();
    
    try {
      const { data, error } = await client.supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: userData
      });
      
      if (error) {
        console.error('User creation error:', error);
        throw error;
      }
      
      return data.user;
    } catch (error) {
      console.error('Error in AuthClient.createUser:', error);
      throw error;
    }
  }
}

module.exports = AuthClient;