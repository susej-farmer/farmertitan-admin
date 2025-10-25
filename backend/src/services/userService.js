const { createClient } = require('@supabase/supabase-js');

class UserService {
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

  static async getUserWithRoles(userId) {
    const service = new UserService();
    
    try {
      // Get user profile with global role only
      const { data: user, error: userError } = await service.supabase
        .from('user')
        .select(`
          *,
          global_role
        `)
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }
      
      // Return user without farm roles (global users only)
      return {
        ...user,
        farm_roles: []
      };
    } catch (error) {
      console.error('Error in UserService.getUserWithRoles:', error);
      throw error;
    }
  }

  static async createUserProfile(authUserId, profileData = {}) {
    const service = new UserService();
    
    try {
      const { data, error } = await service.supabase
        .from('user')
        .insert([{
          id: authUserId,
          global_role: profileData.global_role || 'regular_user',
          ...profileData
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in UserService.createUserProfile:', error);
      throw error;
    }
  }

  static async updateLastLogin(userId) {
    // Temporarily disabled - last_login column doesn't exist in user table
    console.log('updateLastLogin called for user:', userId);
    return null;
  }

  static async updateUserProfile(userId, updates) {
    const service = new UserService();
    
    try {
      const { data, error } = await service.supabase
        .from('user')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in UserService.updateUserProfile:', error);
      throw error;
    }
  }

  static async getUserByEmail(email) {
    const service = new UserService();
    
    try {
      // First get from auth.users
      const { data: authUsers, error: authError } = await service.supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (authError) {
        console.error('Error fetching auth user:', authError);
        throw authError;
      }
      
      // Then get profile
      return await this.getUserWithRoles(authUsers.id);
    } catch (error) {
      console.error('Error in UserService.getUserByEmail:', error);
      throw error;
    }
  }

  static async assignFarmRole(userId, farmId, role) {
    const service = new UserService();
    
    try {
      // Check if assignment already exists
      const { data: existing } = await service.supabase
        .from('_farm_user')
        .select('id')
        .eq('user', userId)
        .eq('farm', farmId)
        .single();
      
      if (existing) {
        // Update existing role
        const { data, error } = await service.supabase
          .from('_farm_user')
          .update({ role })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new assignment
        const { data, error } = await service.supabase
          .from('_farm_user')
          .insert([{
            user: userId,
            farm: farmId,
            role
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error in UserService.assignFarmRole:', error);
      throw error;
    }
  }

  static async removeFarmRole(userId, farmId) {
    const service = new UserService();
    
    try {
      const { error } = await service.supabase
        .from('_farm_user')
        .delete()
        .eq('user', userId)
        .eq('farm', farmId);
      
      if (error) {
        console.error('Error removing farm role:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in UserService.removeFarmRole:', error);
      throw error;
    }
  }
}

module.exports = UserService;