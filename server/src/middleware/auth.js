import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a unique random value of at least 32 characters.');
  }
  return secret;
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'nepalstay-api',
      audience: 'nepalstay-client',
    });
    if (!decoded?.id) return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is unavailable.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: 'Session expired. Please sign in again.' });
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }
}

export function requireHost(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
  if (!['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Host access required.' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Administrator access required.' });
  return next();
}

export function generateToken(user) {
  return jwt.sign({ id: user._id || user.id }, getJwtSecret(), {
    expiresIn: '12h',
    algorithm: 'HS256',
    issuer: 'nepalstay-api',
    audience: 'nepalstay-client',
  });
}

/** Optional authentication for routes that serve public content and private owner previews. */
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header) return next();
    if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Invalid authentication header.' });
    const token = header.slice(7).trim();
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'nepalstay-api',
      audience: 'nepalstay-client',
    });
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') return res.status(401).json({ success: false, error: 'Invalid authentication session.' });
    req.user = user;
    return next();
  } catch {
    // Public resources remain accessible when a browser has an expired/stale token.
    req.user = undefined;
    return next();
  }
}
