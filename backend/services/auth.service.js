import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

/**
 * Builds the serialized user object returned to the client after
 * login/register/verify. Matches the frontend `{ user: {...} }` shape.
 */
export const toAuthUser = async (user, lastLoginAt = user.lastLoginAt) => {
  const base = {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
    loggedInAt: lastLoginAt || new Date().toISOString(),
  };

  try {
    if (user.role === 'doctor') {
      const { Doctor } = await import('../models/index.js');
      const doc = await Doctor.findOne({ user: user._id });
      if (doc) {
        base.doctorId = doc.doctorId || doc.id || doc._id.toString();
        base.specialty = doc.specialization;
        base.hospital = doc.hospital;
      }
    } else if (user.role === 'patient') {
      const { Patient } = await import('../models/index.js');
      const pat = await Patient.findOne({ user: user._id });
      if (pat) {
        base.patientId = pat.patientId || pat.id || pat._id.toString();
        base.village = pat.personalInfo?.village || '';
      }
    }
  } catch (e) {
    /* ignore profile enrichment errors */
  }

  return base;
};

export const authService = {
  signAccessToken,
  verifyAccessToken,
  toAuthUser,
};

export default authService;
