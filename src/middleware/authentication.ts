import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../types';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

export const authentication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided or invalid format');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Add user information to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      logger.debug(`Authenticated user: ${req.user.id}, Role: ${req.user.role}`);
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      } else {
        throw new UnauthorizedError('Token verification failed');
      }
    }
  } catch (error) {
    next(error);
  }
};

// Middleware for checking specific permissions
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== 'admin') {
      throw new UnauthorizedError(`Insufficient permissions: ${permission} required`);
    }

    next();
  };
};

// Middleware for checking user roles
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new UnauthorizedError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

// Middleware for resource ownership validation
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Admin users can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const resourceId = req.params[resourceIdParam];
    
    // For athlete resources, check if the user owns the resource
    if (req.user.role === 'athlete' && req.user.id !== resourceId) {
      throw new UnauthorizedError('Access denied. You can only access your own resources');
    }

    next();
  };
};