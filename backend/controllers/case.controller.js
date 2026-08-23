import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { CaseFile, Patient } from '../models/index.js';

const CASE_PUBLIC_FIELDS =
  'caseId patient patientRefId doctor doctorInfo status triageLevel complaint reportedSymptoms negativeFindings clinicalSummary differentials warningSigns followupQuestions nextStep recommendation diagnosis consultationSummary consultationNotes consultationApproved approvedAt approvedBy confidence referral source generatedAt createdAt updatedAt';

const resolvePatientRef = async (value) => {
  if (!value) return null;
  const query = mongoose.isValidObjectId(String(value))
    ? { _id: value }
    : { patientId: String(value) };
  return Patient.findOne(query)
    .select('_id patientId personalInfo.village')
    .lean();
};

/**
 * Normalizes doctor information for display: prefers the embedded
 * `doctorInfo` snapshot, otherwise derives it from a populated doctor ref.
 */
const normalizeDoctor = (caseFile) => {
  if (!caseFile) return caseFile;
  const doc = { ...caseFile };
  const embedded = doc.doctorInfo && (doc.doctorInfo.name || doc.doctorInfo.specialization || doc.doctorInfo.facility);
  if (embedded) {
    doc.doctor = {
      name: doc.doctorInfo.name || '',
      specialization: doc.doctorInfo.specialization || '',
      facility: doc.doctorInfo.facility || '',
    };
  } else if (doc.doctor && doc.doctor._id) {
    doc.doctor = {
      name: doc.doctor.name || '',
      specialization: doc.doctor.specialization || '',
      facility: doc.doctor.hospital || '',
    };
  }
  delete doc.doctorInfo;
  return doc;
};

/**
 * POST /cases
 * Role: doctor, admin
 * Persists a patient's submitted clinical case (symptoms, triage result,
 * AI clinical summary, possible conditions, warning signs, recommendations,
 * confidence score and timestamps). Body must include `patientId` (JD-xxxx)
 * or `patient` (ObjectId); all report fields are optional.
 */
export const createCase = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const patientRef = await resolvePatientRef(body.patientId || body.patient);
  if (!patientRef) throw new ApiError(404, 'Patient not found.');

  const payload = { ...body };
  delete payload.patientId;
  payload.patient = patientRef._id;
  payload.patientRefId = patientRef.patientId || '';

  // Accept a doctor reference (`doctorId` or an ObjectId in `doctor`) or an
  // embedded doctor object that is stored as `doctorInfo` for display.
  let doctorRef = null;
  if (payload.doctorId) {
    doctorRef = payload.doctorId;
    delete payload.doctorId;
  } else if (payload.doctor && mongoose.isValidObjectId(String(payload.doctor))) {
    doctorRef = payload.doctor;
  }
  if (payload.doctor && typeof payload.doctor === 'object') {
    payload.doctorInfo = payload.doctor;
  }
  delete payload.doctor;
  payload.doctor = doctorRef;

  if (!payload.generatedAt) payload.generatedAt = new Date();
  if (body.referral === undefined) payload.referral = null;

  const caseFile = await CaseFile.create(payload);
  return created(res, normalizeDoctor(caseFile.toJSON()));
});

/**
 * GET /cases
 * Role: doctor, admin
 * Query: { patientId, triageLevel, status, page, limit }
 */
export const getCases = asyncHandler(async (req, res) => {
  const { patientId, triageLevel, status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (patientId) query.patientRefId = patientId;
  if (triageLevel) query.triageLevel = triageLevel;
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    CaseFile.find(query)
      .select(CASE_PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('doctor', 'name specialization hospital')
      .lean(),
    CaseFile.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /cases/patient/:id
 * Role: doctor, admin
 * Returns the most recent stored case file for a patient, looked up by
 * Mongo ObjectId or by the human-readable patient reference (JD-xxxx).
 */
export const getLatestCaseByPatient = asyncHandler(async (req, res) => {
  const ref = String(req.params.id);
  const query = mongoose.isValidObjectId(ref)
    ? { patient: ref }
    : { patientRefId: ref };

  const caseFile = await CaseFile.findOne(query)
    .select(CASE_PUBLIC_FIELDS)
    .sort({ createdAt: -1 })
    .populate('doctor', 'name specialization hospital')
    .lean();

  if (!caseFile) throw new ApiError(404, 'No stored case found for this patient.');
  return success(res, normalizeDoctor(caseFile));
});

/**
 * GET /cases/:id
 * Role: doctor, admin
 */
export const getCaseById = asyncHandler(async (req, res) => {
  const caseFile = await CaseFile.findById(req.params.id)
    .select(CASE_PUBLIC_FIELDS)
    .populate('doctor', 'name specialization hospital')
    .lean();
  if (!caseFile) throw new ApiError(404, 'Case not found.');
  return success(res, normalizeDoctor(caseFile));
});

/**
 * PUT /cases/:id
 * Role: doctor, admin
 * Updates a stored case file (e.g. clinician edits, referral added).
 */
export const updateCase = asyncHandler(async (req, res) => {
  const caseFile = await CaseFile.findById(req.params.id);
  if (!caseFile) throw new ApiError(404, 'Case not found.');

  const updates = req.body || {};
  delete updates.patient;
  delete updates.patientRefId;
  Object.assign(caseFile, updates);
  await caseFile.save();

  return success(res, caseFile);
});

/**
 * POST /cases/patient/:id/consultation-summary
 * Role: doctor, admin
 * Saves a doctor-approved AI-assisted consultation summary onto the
 * patient's existing (most recent) stored case file. Looks up the case by
 * Mongo ObjectId or by the human-readable patient reference (JD-xxxx).
 * Body: { diagnosis, consultationSummary, consultationNotes, approvedBy }
 */
export const saveConsultationSummary = asyncHandler(async (req, res) => {
  const ref = String(req.params.id);
  const query = mongoose.isValidObjectId(ref)
    ? { patient: ref }
    : { patientRefId: ref };

  const caseFile = await CaseFile.findOne(query).sort({ createdAt: -1 });
  if (!caseFile) {
    throw new ApiError(404, 'No stored case found for this patient.');
  }

  const { diagnosis, consultationSummary, consultationNotes, approvedBy } =
    req.body || {};
  if (diagnosis !== undefined) caseFile.diagnosis = diagnosis;
  if (consultationSummary !== undefined) {
    caseFile.consultationSummary = consultationSummary;
  }
  if (consultationNotes !== undefined) {
    caseFile.consultationNotes = consultationNotes;
  }
  caseFile.consultationApproved = true;
  caseFile.approvedAt = new Date();
  if (approvedBy) caseFile.approvedBy = String(approvedBy);

  await caseFile.save();

  return success(res, normalizeDoctor(caseFile.toJSON()));
});

/**
 * GET /cases/analytics
 * Role: doctor, admin
 * Aggregates the stored case files so Doctor and Admin portals/analytics
 * read from the same persisted data source.
 */
export const getCaseAnalytics = asyncHandler(async (_req, res) => {
  const analytics = await buildCaseAnalytics();
  return success(res, analytics);
});

export const buildCaseAnalytics = async () => {
  const [total, triageGroups, regionGroups, conditionGroups, referralCount, confidentCount] =
    await Promise.all([
      CaseFile.countDocuments({}),
      CaseFile.aggregate([{ $group: { _id: '$triageLevel', count: { $sum: 1 } } }]),
      CaseFile.aggregate([
        {
          $lookup: {
            from: 'patients',
            localField: 'patient',
            foreignField: '_id',
            as: 'pt',
          },
        },
        { $unwind: { path: '$pt', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$pt.personalInfo.village', 'Unknown'] },
            total: { $sum: 1 },
            escalated: {
              $sum: { $cond: [{ $ne: ['$referral', null] }, 1, 0] },
            },
          },
        },
      ]),
      CaseFile.aggregate([
        { $unwind: '$differentials' },
        { $group: { _id: '$differentials.condition', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      CaseFile.countDocuments({ referral: { $ne: null } }),
      CaseFile.countDocuments({ confidence: { $gte: 0.8 } }),
    ]);

  const triageToRisk = { routine: 'low', standard: 'moderate', priority: 'high' };
  const riskDistribution = { low: 0, moderate: 0, high: 0, critical: 0 };
  let routineCount = 0;
  for (const g of triageGroups) {
    const key = triageToRisk[g._id];
    if (key) riskDistribution[key] = g.count;
    if (g._id === 'routine') routineCount = g.count;
  }

  const byRegion = regionGroups
    .map((r) => ({
      region: r._id,
      total: r.total,
      resolved: Math.max(0, r.total - r.escalated),
      escalated: r.escalated,
    }))
    .sort((a, b) => b.total - a.total);

  const inFollowUp = routineCount;
  const escalated = referralCount;
  const resolved = Math.max(0, total - escalated - inFollowUp);

  return {
    totalCases: total,
    resolved,
    escalated,
    inFollowUp,
    diagnosisTrends: {
      labels: conditionGroups.map((c) => c._id),
      data: conditionGroups.map((c) => c.count),
    },
    triageAccuracy: total ? Math.round((confidentCount / total) * 100) : 0,
    referralRate: total ? Math.round((referralCount / total) * 100) : 0,
    riskDistribution,
    byRegion,
  };
};

export const caseController = {
  createCase,
  getCases,
  getLatestCaseByPatient,
  getCaseById,
  updateCase,
  saveConsultationSummary,
  getCaseAnalytics,
};

export default caseController;
