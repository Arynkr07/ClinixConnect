import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import env from '../config/env.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.query && req.query.token) return String(req.query.token).trim();
  return null;
};

/**
 * Parses a demo session token like 'token-admin-1234567890' and extracts the role.
 * Token format: token-<role>-<timestamp>
 */
const parseDemoToken = (token) => {
  if (!token || !token.startsWith('token-')) return null;
  // token-admin-1234 → ['token','admin','1234']
  const withoutPrefix = token.slice('token-'.length); // 'admin-1234'
  // Role is everything up to the last '-<digits>' segment
  const match = withoutPrefix.match(/^([a-zA-Z]+)/);
  return match ? match[1].toLowerCase() : 'patient';
};

/**
 * Verifies the JWT and attaches the authenticated user to req.user.
 * For demo/offline sessions (token-<role>-<timestamp>), the role is
 * derived directly from the token string so admin users always pass.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  // ── Demo / offline token path ──────────────────────────────────────────────
  const demoRole = parseDemoToken(token);
  if (demoRole) {
    req.user = {
      _id: `demo-${demoRole}-id`,
      name: demoRole === 'doctor' ? 'Dr. Rajesh Sharma' : demoRole === 'admin' ? 'Admin User' : 'Patient User',
      email: `${demoRole}@clinixconnect.org`,
      role: demoRole,
      isActive: true,
    };
    return next();
  }

  // ── Real JWT path ──────────────────────────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token. Please log in again.');
  }

  // Look up DB user; fallback to payload claims if MongoDB is unreachable / user not seeded
  let user = null;
  try {
    user = await User.findById(payload.id || payload._id || payload.sub).lean();
  } catch {
    /* DB lookup optional – use payload fallback below */
  }

  if (!user) {
    user = {
      _id: payload.id || payload._id || payload.sub || 'fallback-id',
      name: payload.name || 'User',
      email: payload.email || 'user@clinixconnect.org',
      role: payload.role || 'patient',
      isActive: true,
    };
  }

  req.user = user;
  req.tokenPayload = payload;
  return next();
});

export const authorize = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
      );
    }
    return next();
  });

export default authenticate;
