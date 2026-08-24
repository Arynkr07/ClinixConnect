import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, noContent } from '../utils/response.js';
import { User, ROLES } from '../models/User.js';
import { authService } from '../services/auth.service.js';
import { emailService } from '../services/email.service.js';

const PASSWORD_RESET_OTPS = new Map();

const isValidRole = (role) =>
  Object.values(ROLES).includes(role);

const isPublicRole = (role) =>
  [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT].includes(role);

/**
 * POST /auth/login
 * Body: { role, email, password }
 */
export const login = asyncHandler(async (req, res) => {
  const { role, email, password } = req.body || {};

  if (!role || !isValidRole(role)) {
    throw new ApiError(400, 'A valid role is required.');
  }
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase(), role }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact support.');
  }

  // Enforce approval checks for Doctor and Admin roles
  if (user.role === 'doctor' && user.isApproved === false) {
    throw new ApiError(403, 'Your Doctor account is pending approval by the Admin. Please wait for approval before signing in.');
  }
  if (user.role === 'admin' && user.isApproved === false && !user.isMainAdmin) {
    throw new ApiError(403, 'Your Admin account is pending approval by the Default Main Admin.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  // Ensure and update linked profile in MongoDB Atlas
  try {
    if (role === 'doctor') {
      const { Doctor } = await import('../models/index.js');
      let doc = await Doctor.findOne({ user: user._id });
      if (!doc) {
        doc = await Doctor.create({
          user: user._id,
          doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          specialization: 'General Medicine',
          hospital: 'District Health Centre',
          workingHours: { start: '09:00', end: '17:00' },
          slotDuration: 30,
          leaveDays: [],
          availability: { status: 'online' },
        });
      } else {
        doc.availability = { ...doc.availability, status: 'online' };
        await doc.save();
      }
    } else if (role === 'patient') {
      const { Patient } = await import('../models/index.js');
      let pat = await Patient.findOne({ user: user._id });
      if (!pat) {
        pat = await Patient.create({
          user: user._id,
          patientId: `JD-${Math.floor(1000 + Math.random() * 9000)}`,
          personalInfo: {
            fullName: user.name,
            email: user.email,
            phone: user.phone || '',
            village: 'Amroli',
          },
          vitals: { bp: '120/80', temp: '98.6°F', weight: 60, pulse: 72 },
          queue: { risk: 'low', status: 'waiting', reason: 'Routine Checkup' },
        });
      }
    }
  } catch (err) {
    console.warn('[auth.login] profile sync skipped:', err.message);
  }

  const token = authService.signAccessToken(user);
  const payload = await authService.toAuthUser(user);
  return success(res, { token, user: payload }, { role }, 200);
});

/**
 * POST /auth/register
 * Body: { role, name, email, password, phone?, profile? }
 * Public registration is limited to non-admin roles.
 */
export const register = asyncHandler(async (req, res) => {
  const { role, name, email, password, phone, profile, specialization, shiftType, workingHours } = req.body || {};

  if (!role || !isValidRole(role)) {
    throw new ApiError(400, 'A valid role (patient, doctor) is required.');
  }
  if (role === 'admin') {
    throw new ApiError(403, 'Public registration for admin is disabled. Please log in with the main admin account (admin@clinixconnect.org).');
  }
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required.');
  }
  if (String(password).length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const isDefaultAdmin = role === 'admin' && (email.toLowerCase() === 'admin@clinixconnect.org' || email.toLowerCase() === 'admin@jeevandoot.org');
  const isApproved = role === 'patient' || isDefaultAdmin;

  const user = await User.create({
    role,
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || '',
    isApproved,
    isMainAdmin: isDefaultAdmin,
  });

  // Automatically create linked Doctor or Patient profile in MongoDB
  try {
    if (role === 'doctor') {
      const chosenShift = shiftType || profile?.shiftType || 'Day Shift';
      const defaultHours = chosenShift === 'Night Shift' ? { start: '21:00', end: '05:00' } : { start: '09:00', end: '17:00' };

      const { Doctor } = await import('../models/index.js');
      await Doctor.create({
        user: user._id,
        doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
        name: user.name,
        specialization: specialization || profile?.specialization || profile?.specialty || 'General Medicine',
        shiftType: chosenShift,
        email: user.email,
        phone: user.phone || '',
        workingHours: workingHours || profile?.workingHours || defaultHours,
        slotDuration: 30,
        leaveDays: [],
        availability: { status: 'offline' },
        verification: 'Pending',
      });

      // Trigger email alert to Default Main Admin notifying them of pending doctor registration
      try {
        const { emailService } = await import('../services/email.service.js');
        await emailService.sendDoctorPendingApprovalAdminAlert({
          adminEmail: 'admin@clinixconnect.org',
          doctorName: user.name,
          doctorEmail: user.email,
          doctorSpecialization: specialization || profile?.specialization || profile?.specialty || 'General Medicine',
          phone: user.phone,
        });
      } catch (emailErr) {
        console.warn('[auth.register] Admin email notification notice:', emailErr.message);
      }
    } else if (role === 'patient') {
      const { generatePatientId } = await import('../utils/generateId.js');
      await Patient.create({
        user: user._id,
        patientId: generatePatientId(user.name, user.createdAt || new Date()),
        personalInfo: {
          fullName: user.name,
          email: user.email,
          phone: user.phone || '',
          village: profile?.village || 'Amroli',
        },
        vitals: { bp: '120/80', temp: '98.6°F', weight: 60, pulse: 72 },
        queue: { risk: 'low', status: 'waiting', reason: 'Initial Registration' },
      });
    } else if (role === 'admin' && !isDefaultAdmin) {
      // Trigger email alert to Default Main Admin notifying them of a pending admin registration
      try {
        const { emailService: es } = await import('../services/email.service.js');
        if (typeof es.sendAdminPendingApprovalAlert === 'function') {
          await es.sendAdminPendingApprovalAlert({
            adminEmail: 'admin@clinixconnect.org',
            newAdminName: user.name,
            newAdminEmail: user.email,
            phone: user.phone,
          });
        }
      } catch (emailErr) {
        console.warn('[auth.register] Admin approval email notice:', emailErr.message);
      }
    }
  } catch (e) {
    console.warn('[auth.register] profile linking skipped:', e.message);
  }

  // For unapproved admin or doctor accounts, return 202 Pending without a JWT.
  // They cannot log in until the Main Admin approves their account.
  if (!isApproved && (role === 'admin' || role === 'doctor')) {
    const pendingMsg =
      role === 'admin'
        ? 'Admin account registered! Your profile is pending approval by the Default Main Admin (admin@clinixconnect.org). You will be notified once approved.'
        : 'Doctor account registered! Your profile is pending approval by the Admin. You will be notified once approved.';
    return success(
      res,
      { pending: true, user: { id: user._id, name: user.name, email: user.email, role, isApproved: false } },
      { message: pendingMsg },
      202
    );
  }

  const token = authService.signAccessToken(user);
  const payload = await authService.toAuthUser(user);
  return success(res, { token, user: payload }, { role }, 201);
});

/**
 * POST /auth/logout
 * Stateless JWT — client discards the token. Kept for API symmetry.
 */
export const logout = asyncHandler(async (_req, res) => noContent(res));

/**
 * GET /auth/verify
 * Query: { token }
 */
export const verifyToken = asyncHandler(async (req, res) => {
  const { token } = req.query || {};
  if (!token) {
    throw new ApiError(400, 'Token is required.');
  }

  const payload = authService.verifyAccessToken(String(token));
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Token is not associated with an active account.');
  }

  return success(res, {
    valid: true,
    user: authService.toAuthUser(user),
  });
});

/**
 * POST /auth/request-access
 * Body: { role, name, email, reason }
 * Stub for admin-approval flows; returns a receipt without creating a user.
 */
export const requestAccess = asyncHandler(async (req, res) => {
  const { role, name, email, reason } = req.body || {};
  if (!role || !name || !email) {
    throw new ApiError(400, 'Role, name and email are required.');
  }

  return success(
    res,
    {
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      status: 'pending',
    },
    { message: 'Access request submitted for review.' },
    202
  );
});

/**
 * POST /auth/forgot-password
 * Body: { email, role }
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new ApiError(400, 'Email address is required.');

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  PASSWORD_RESET_OTPS.set(cleanEmail, {
    otpCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  // Send Email via Nodemailer SMTP
  try {
    await emailService.sendPasswordResetOTP({
      email: cleanEmail,
      name: user ? user.name : 'User',
      otpCode,
    });
  } catch (err) {
    console.warn('[auth.forgotPassword] Email send failed:', err.message);
  }

  return success(
    res,
    { email: cleanEmail, otpSent: true },
    { message: `Password reset verification code sent to ${cleanEmail} via SMTP.` }
  );
});

/**
 * POST /auth/reset-password
 * Body: { email, otpCode, newPassword }
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otpCode, newPassword } = req.body || {};
  if (!email || !otpCode || !newPassword) {
    throw new ApiError(400, 'Email, OTP verification code, and new password are required.');
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const resetData = PASSWORD_RESET_OTPS.get(cleanEmail);

  if (!resetData || resetData.otpCode !== String(otpCode).trim()) {
    throw new ApiError(400, 'Invalid or expired OTP verification code.');
  }

  if (Date.now() > resetData.expiresAt) {
    PASSWORD_RESET_OTPS.delete(cleanEmail);
    throw new ApiError(400, 'OTP code has expired. Please request a new code.');
  }

  // Update Password in database if user exists
  const user = await User.findOne({ email: cleanEmail });
  if (user) {
    user.password = newPassword;
    await user.save();
  }

  PASSWORD_RESET_OTPS.delete(cleanEmail);

  return success(
    res,
    { email: cleanEmail, passwordReset: true },
    { message: 'Password updated successfully! You can now log in.' }
  );
});

export const authController = {
  login,
  register,
  logout,
  verifyToken,
  requestAccess,
  forgotPassword,
  resetPassword,
};
export default authController;
