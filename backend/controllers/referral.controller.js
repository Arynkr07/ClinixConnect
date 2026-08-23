import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created } from '../utils/response.js';
import {
  Referral,
  Patient,
  Doctor,
  REFERRAL_DESTINATIONS,
} from '../models/index.js';
import { notificationService } from '../services/notification.service.js';

/**
 * GET /referrals/destinations
 * Static list of referral destination facilities.
 */
export const getDestinations = asyncHandler(async (_req, res) => {
  return success(res, REFERRAL_DESTINATIONS);
});

/**
 * GET /referrals
 * Query: { patient, doctor, status, page, limit }
 */
export const getReferrals = asyncHandler(async (req, res) => {
  const { patient, doctor, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (doctor) query.doctor = doctor;
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    Referral.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('patient', 'patientId personalInfo')
      .populate('doctor', 'name specialization')
      .lean(),
    Referral.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * POST /referrals
 * Body: { patientId, patientName?, destination, priority, reason, notes }
 * The frontend form sends patientId + patientName; patientName is only
 * used for display fallback.
 */
export const createReferral = asyncHandler(async (req, res) => {
  const { patientId, patientName, destination, priority, reason, notes } =
    req.body || {};

  if (!patientId || !destination) {
    throw new ApiError(400, 'Referral requires a patient and destination.');
  }

  const doctor = await Doctor.findOne({ user: req.user._id }).lean();
  if (!doctor) throw new ApiError(404, 'Doctor profile not found.');

  const patient = await Patient.findOne({ patientId }).lean();
  if (!patient) throw new ApiError(404, 'Patient not found.');

  const referral = await Referral.create({
    patient: patient._id,
    doctor: doctor._id,
    destination,
    priority: priority || 'normal',
    reason: reason || '',
    notes: notes || '',
  });

  const populated = await Referral.findById(referral._id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization');

  try {
    await notificationService.notify({
      userIds: patient.user,
      title: 'Referral initiated',
      description: `You have been referred for ${reason || 'specialist care'}.`,
      type: 'referral',
      link: '/patient/referrals',
    });
  } catch (error) {
    console.warn('[referral] notification skipped:', error.message);
  }

  return created(res, populated);
});

/**
 * GET /referrals/:referralId/status
 * Lookup by the business referralId (frontend contract).
 */
export const getReferralStatus = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ referralId: req.params.referralId })
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization')
    .lean();
  if (!referral) throw new ApiError(404, 'Referral not found.');

  return success(res, { status: referral.status, referral });
});

export const referralController = {
  getDestinations,
  getReferrals,
  createReferral,
  getReferralStatus,
};

export default referralController;
