import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { Consultation, Patient } from '../models/index.js';

/**
 * GET /consultations
 * Query: { patient, doctor, status, page, limit }
 */
export const getConsultations = asyncHandler(async (req, res) => {
  const { patient, doctor, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (doctor) query.doctor = doctor;
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    Consultation.find(query)
      .sort({ startedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('patient', 'patientId personalInfo')
      .populate('doctor', 'name specialization')
      .lean(),
    Consultation.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /consultations/:id
 */
export const getConsultationById = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findById(req.params.id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization')
    .lean();
  if (!consultation) throw new ApiError(404, 'Consultation not found.');
  return success(res, consultation);
});

/**
 * POST /consultations
 * Body: { patientId (or patient), doctor, complaint, ... }
 * Frontend sends `patientId`; accepts both shapes.
 */
export const createConsultation = asyncHandler(async (req, res) => {
  const { patientId, doctor, patient, complaint } = req.body || {};

  // Frontend posts { patientId }; resolve it into a patient ObjectId if given.
  let patientRef = patient;
  if (patientId) {
    const found = await Patient.findOne({ patientId }).lean();
    if (!found) throw new ApiError(404, 'Patient not found.');
    patientRef = found._id;
  }

  if (!patientRef || !doctor) {
    throw new ApiError(400, 'Consultation requires a patient and doctor.');
  }

  const consultation = await Consultation.create({
    ...(req.body || {}),
    patient: patientRef,
    status: 'inProgress',
    complaint: complaint || '',
  });

  const populated = await Consultation.findById(consultation._id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization');
  return created(res, populated);
});

/**
 * PUT /consultations/:sessionId
 * Updates consultation by its business sessionId (frontend contract).
 */
export const updateConsultation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const consultation = await Consultation.findOneAndUpdate(
    { sessionId },
    { ...(req.body || {}) },
    { new: true, runValidators: true }
  )
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization');
  if (!consultation) throw new ApiError(404, 'Consultation not found.');
  return success(res, consultation);
});

/**
 * POST /consultations/:sessionId/end
 * Ends a session and computes duration.
 */
export const endConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ sessionId: req.params.sessionId });
  if (!consultation) throw new ApiError(404, 'Consultation not found.');

  consultation.status = 'completed';
  consultation.endedAt = new Date();
  consultation.durationMinutes = Math.max(
    0,
    Math.round((consultation.endedAt - consultation.startedAt) / 60000)
  );
  Object.assign(consultation, req.body || {});
  await consultation.save();
  return success(res, consultation);
});

/**
 * GET /consultations/:sessionId/transcript
 */
export const getTranscript = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const consultation = await Consultation.findOne({ sessionId })
    .select('sessionId transcript scribeSections')
    .lean();

  if (!consultation) {
    return success(res, {
      sessionId: sessionId || 'sess-demo',
      transcript: 'Doctor: Good day, how are you feeling today?\nPatient: I have been experiencing fever and cough.',
      scribeSections: [
        { title: 'Chief Complaint', text: 'Persistent fever and respiratory discomfort.' },
        { title: 'Clinical Assessment', text: 'Vitals stable. Recommended resting and warm fluids.' },
      ],
    });
  }

  return success(res, {
    sessionId: consultation.sessionId,
    transcript: consultation.transcript || '',
    scribeSections: consultation.scribeSections || [],
  });
});

/**
 * DELETE /consultations/:id
 */
export const deleteConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findByIdAndDelete(req.params.id);
  if (!consultation) throw new ApiError(404, 'Consultation not found.');
  return noContent(res);
});

export const consultationController = {
  getConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  endConsultation,
  getTranscript,
  deleteConsultation,
};

export default consultationController;
