import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nepalstay_jwt_secret_super_secure_key_2026';

/**
 * Middleware: Verify Bearer JWT and populate req.user
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Account not found or has been removed.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended by the platform administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }
}

/**
 * Middleware: Require Host (Owner) or Admin role
 */
export function requireHost(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access restricted to registered Hosts or Platform Administrators.' });
  }
  next();
}

/**
 * Middleware: Require Administrator clearance
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access restricted to Platform Administrators.' });
  }
  next();
}

/**
 * Generate a signed JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

