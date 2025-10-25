const express = require('express');
const router = express.Router();

const AuthClient = require('../clients/authClient');
const UserService = require('../services/userService');
const { verifyToken, requireAuth } = require('../middleware/auth');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

// =====================================================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================================================

// Login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
  }
  
  try {
    // Authenticate with Supabase
    const { user, session } = await AuthClient.login(email, password);
    
    if (!user || !session) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    
    // Get or create user profile
    let userProfile;
    try {
      userProfile = await UserService.getUserWithRoles(user.id);
    } catch (error) {
      // If user profile doesn't exist, create it
      if (error.code === 'PGRST116') { // No rows found
        userProfile = await UserService.createUserProfile(user.id, {
          global_role: 'regular_user'
        });
      } else {
        throw error;
      }
    }
    
    // Update last login
    await UserService.updateLastLogin(user.id);
    
    // Return user data with token
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          ...userProfile
        },
        token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message?.includes('Invalid login credentials')) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    throw error;
  }
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
  }
  
  try {
    const { session, user } = await AuthClient.refreshToken(refresh_token);
    
    if (!session || !user) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    
    // Get user profile
    const userProfile = await UserService.getUserWithRoles(user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          ...userProfile
        },
        token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at
      },
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    throw new AppError('Failed to refresh token', 401, 'REFRESH_FAILED');
  }
}));

// =====================================================================================
// PROTECTED ROUTES (Authentication required)
// =====================================================================================

// Get current user profile
router.get('/me', verifyToken, requireAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// Logout endpoint
router.post('/logout', verifyToken, requireAuth, asyncHandler(async (req, res) => {
  try {
    await AuthClient.logout();
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails on Supabase side, we consider it successful from client perspective
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}));

// Update user profile
router.put('/profile', verifyToken, requireAuth, asyncHandler(async (req, res) => {
  const { name, phone, preferences } = req.body;
  
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (preferences !== undefined) updates.preferences = preferences;
  
  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400, 'NO_UPDATES');
  }
  
  const updatedUser = await UserService.updateUserProfile(req.user.id, updates);
  
  res.json({
    success: true,
    data: {
      user: updatedUser
    },
    message: 'Profile updated successfully'
  });
}));

// Change password endpoint
router.post('/change-password', verifyToken, requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    throw new AppError('Current password and new password are required', 400, 'MISSING_PASSWORDS');
  }
  
  if (new_password.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400, 'PASSWORD_TOO_SHORT');
  }
  
  try {
    // First verify current password by attempting login
    await AuthClient.login(req.user.email, current_password);
    
    // Update password (this would require admin privileges or user context)
    // For now, we'll throw an error as this requires special handling
    throw new AppError('Password change functionality not yet implemented', 501, 'NOT_IMPLEMENTED');
    
  } catch (error) {
    if (error.message?.includes('Invalid login credentials')) {
      throw new AppError('Current password is incorrect', 401, 'INCORRECT_CURRENT_PASSWORD');
    }
    throw error;
  }
}));

module.exports = router;