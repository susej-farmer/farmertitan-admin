const AuthClient = require('../clients/authClient');
const UserService = require('../services/userService');
const { getSupabaseClient } = require('../clients/supabaseClient');
const { AppError } = require('./errorHandler');

/**
 * Middleware to verify JWT token and extract user information
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase using the request's environment config
    const { user } = await AuthClient.verifyToken(token, req);

    if (!user) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    // Get Supabase client for this request's environment
    const supabase = getSupabaseClient(req);

    // Get user profile with roles
    const userWithRoles = await UserService.getUserWithRoles(user.id, supabase);

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      ...userWithRoles
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    console.error('Token verification error:', error);
    next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
  }
};

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }
  next();
};

/**
 * Middleware to require super admin role
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }
  
  if (req.user.global_role !== 'super_admin') {
    return next(new AppError('Super admin access required', 403, 'FORBIDDEN'));
  }
  
  next();
};

/**
 * Middleware to require admin role (super admin or farm admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }
  
  const isSuperAdmin = req.user.global_role === 'super_admin';
  const isFarmAdmin = req.user.farm_roles?.some(role => 
    ['admin', 'manager'].includes(role.role)
  );
  
  if (!isSuperAdmin && !isFarmAdmin) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  
  next();
};

/**
 * Middleware to require specific farm access
 */
const requireFarmAccess = (farmId) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    const isSuperAdmin = req.user.global_role === 'super_admin';
    
    if (isSuperAdmin) {
      return next(); // Super admin has access to all farms
    }
    
    const hasFarmAccess = req.user.farm_roles?.some(role => 
      role.farm.id === farmId
    );
    
    if (!hasFarmAccess) {
      return next(new AppError('Farm access required', 403, 'FARM_ACCESS_DENIED'));
    }
    
    next();
  };
};

/**
 * Middleware to check farm role permissions
 */
const requireFarmRole = (farmId, requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    const isSuperAdmin = req.user.global_role === 'super_admin';
    
    if (isSuperAdmin) {
      return next(); // Super admin bypasses farm role checks
    }
    
    const farmRole = req.user.farm_roles?.find(role => 
      role.farm.id === farmId
    );
    
    if (!farmRole) {
      return next(new AppError('Farm access required', 403, 'FARM_ACCESS_DENIED'));
    }
    
    if (requiredRoles.length > 0 && !requiredRoles.includes(farmRole.role)) {
      return next(new AppError(`Required role: ${requiredRoles.join(' or ')}`, 403, 'INSUFFICIENT_PERMISSIONS'));
    }
    
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.substring(7);
    const { user } = await AuthClient.verifyToken(token, req);

    if (user) {
      // Get Supabase client for this request's environment
      const supabase = getSupabaseClient(req);

      const userWithRoles = await UserService.getUserWithRoles(user.id, supabase);
      req.user = {
        id: user.id,
        email: user.email,
        ...userWithRoles
      };
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Optional auth error:', error);
    next();
  }
};

module.exports = {
  verifyToken,
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireFarmAccess,
  requireFarmRole,
  optionalAuth
};