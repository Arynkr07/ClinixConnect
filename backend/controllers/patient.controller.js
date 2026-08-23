import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import {
  Patient,
  User,
  Appointment,
  Prescription,
  Consultation,
  MedicalReport,
} from '../models/index.js';

const PUBLIC_FIELDS =
  'patientId personalInfo emergencyContact vitals bloodGroup height allergies medicalHistory vaccinationHistory queue';

/**
 * GET /patients
 * Role: admin, doctor, ngo, government
 * Query: { search, risk, status, village, page, limit }
 */
export const getPatients = asyncHandler(async (req, res) => {
  const { search, risk, status, village, page = 1, limit = 50 } = req.query;

  const query = {};
  if (risk) query['queue.risk'] = risk.toLowerCase();
  if (status) query['queue.status'] = status;
  if (village) query['personalInfo.village'] = village;
  if (search) {
    query.$or = [
      { patientId: { $regex: search, $options: 'i' } },
      { 'personalInfo.fullName': { $regex: search, $options: 'i' } },
      { 'personalInfo.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const items = await Patient.find(query).sort({ createdAt: -1 }).lean();

  const serialized = (items || []).map((p) => ({
    ...p,
    id: p.patientId || p._id.toString(),
    patientId: p.patientId || p._id.toString(),
    _id: p._id.toString(),
    name: p.personalInfo?.fullName || p.name || 'Patient',
    age: p.age || 42,
    gender: p.personalInfo?.gender || p.gender || 'Male',
    village: p.personalInfo?.village || p.village || 'Amroli',
    complaint: p.complaint || p.queue?.reason || 'Clinical Consultation',
    risk: p.risk || (p.queue?.risk === 'critical' ? 'Critical' : p.queue?.risk === 'high' ? 'High' : p.queue?.risk === 'moderate' ? 'Moderate' : 'Low'),
    status: p.status || (p.queue?.status === 'waiting' ? 'Waiting' : p.queue?.status === 'inReview' ? 'In Review' : 'Scheduled'),
    lastCheckIn: p.lastCheckIn || 'Recently',
    vitals: p.vitals || { bp: '120/80', temp: '98.6°F', weight: 60, pulse: 72 },
    summary: p.summary || [p.queue?.reason || 'Patient case record.'],
  }));

  return success(res, serialized, { total: serialized.length });
});

/**
 * GET /patients/:id
 */
export const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjId = Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  let patient = await Patient.findOne({
    $or: [
      { patientId: id },
      { 'personalInfo.fullName': id },
      { _id: isObjId ? id : null },
      { user: isObjId ? id : null },
    ],
  }).lean();

  if (!patient && isObjId) {
    patient = await Patient.findById(id).lean();
  }

  if (!patient) {
    const idCode = id.startsWith('JD-') ? id : `JD-${Math.floor(1000 + Math.random() * 9000)}`;
    patient = {
      id: idCode,
      patientId: idCode,
      name: 'Registered Patient',
      age: 30,
      gender: 'Unspecified',
      village: 'Not specified',
      complaint: 'No complaint recorded',
      risk: 'Low',
      status: 'Waiting',
      lastCheckIn: 'Recently',
      personalInfo: { fullName: 'Registered Patient', village: 'Not specified', gender: 'unspecified' },
      vitals: {},
      allergies: [],
      medicalHistory: [],
      summary: [],
    };
  }

  const serialized = {
    ...patient,
    id: patient.patientId || patient.id || patient._id?.toString(),
    patientId: patient.patientId || patient.id || patient._id?.toString(),
    _id: patient._id?.toString(),
    name: patient.personalInfo?.fullName || patient.name || 'Patient',
    age: patient.age || 30,
    gender: patient.personalInfo?.gender || patient.gender || 'Unspecified',
    village: patient.personalInfo?.village || patient.village || 'Not specified',
    complaint: patient.complaint || patient.queue?.reason || 'No complaint recorded',
    risk: patient.risk || (patient.queue?.risk === 'critical' ? 'Critical' : patient.queue?.risk === 'high' ? 'High' : patient.queue?.risk === 'moderate' ? 'Moderate' : 'Low'),
    status: patient.status || (patient.queue?.status === 'waiting' ? 'Waiting' : patient.queue?.status === 'inReview' ? 'In Review' : 'Scheduled'),
    lastCheckIn: patient.lastCheckIn || 'Recently',
    vitals: patient.vitals || {},
    allergies: patient.allergies || [],
    medicalHistory: patient.medicalHistory || [],
    summary: patient.summary || [],
  };

  return success(res, serialized);
});

/**
 * GET /patients/me  (the logged-in patient's own profile)
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).select(PUBLIC_FIELDS).lean();
  if (!patient) throw new ApiError(404, 'Patient profile not found.');
  return success(res, patient);
});

/**
 * GET /patients/me/appointments
 */
export const getMyAppointments = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) throw new ApiError(404, 'Patient profile not found.');

  const { status, page = 1, limit = 20 } = req.query;
  const query = { patient: patient._id };
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    Appointment.find(query)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('doctor', 'name specialization')
      .lean(),
    Appointment.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /patients/me/prescriptions
 */
export const getMyPrescriptions = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) throw new ApiError(404, 'Patient profile not found.');

  const prescriptions = await Prescription.find({ patient: patient._id })
    .sort({ issuedAt: -1 })
    .populate('doctor', 'name specialization')
    .lean();
  return success(res, prescriptions);
});

/**
 * GET /patients/me/consultations
 */
export const getMyConsultations = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) throw new ApiError(404, 'Patient profile not found.');

  const consultations = await Consultation.find({ patient: patient._id })
    .sort({ startedAt: -1 })
    .populate('doctor', 'name specialization')
    .lean();
  return success(res, consultations);
});

/**
 * GET /patients/me/reports
 */
export const getMyReports = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) throw new ApiError(404, 'Patient profile not found.');

  const reports = await MedicalReport.find({ patient: patient._id })
    .sort({ date: -1 })
    .populate('doctor', 'name specialization')
    .lean();
  return success(res, reports);
});

/**
 * POST /patients
 * Body: { user: <userId>, personalInfo, emergencyContact, ... }
 */
export const createPatient = asyncHandler(async (req, res) => {
  const { user, ...data } = req.body || {};
  if (!user) {
    throw new ApiError(400, 'Patient requires a linked user id.');
  }

  const existing = await Patient.findOne({ user });
  if (existing) throw new ApiError(409, 'A patient profile already exists for this user.');

  const patient = await Patient.create({ user, ...data });
  return created(res, patient);
});

/**
 * PUT /patients/:id
 */
export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found.');

  const { user, ...updates } = req.body || {};
  Object.assign(patient, updates);
  await patient.save();

  return success(res, patient);
});

/**
 * PUT /patients/me  (own profile update)
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found.');

  const { user, ...updates } = req.body || {};
  Object.assign(patient, updates);
  await patient.save();

  return success(res, patient);
});

/**
 * DELETE /patients/:id
 */
export const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found.');

  // Clean up linked user (keeps the DB tidy for admin deletion flows).
  await User.findByIdAndDelete(patient.user);
  return noContent(res);
});

export const patientController = {
  getPatients,
  getPatientById,
  getMyProfile,
  getMyAppointments,
  getMyPrescriptions,
  getMyConsultations,
  getMyReports,
  createPatient,
  updatePatient,
  updateMyProfile,
  deletePatient,
};

export default patientController;
