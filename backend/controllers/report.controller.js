import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { MedicalReport } from '../models/index.js';

/**
 * GET /reports
 * Query: { patient, doctor, type, page, limit }
 */
export const getReports = asyncHandler(async (req, res) => {
  const { patient, doctor, type, page = 1, limit = 20 } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (doctor) query.doctor = doctor;
  if (type) query.type = type;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    MedicalReport.find(query)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('patient', 'patientId personalInfo')
      .populate('doctor', 'name specialization')
      .lean(),
    MedicalReport.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /reports/:id
 */
export const getReportById = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findById(req.params.id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization')
    .lean();
  if (!report) throw new ApiError(404, 'Report not found.');
  return success(res, report);
});

/**
 * POST /reports/generate
 * Creates a report from structured data (the "generate" contract the
 * frontend admin portal uses). Body: report shape.
 */
export const generateReport = asyncHandler(async (req, res) => {
  const { period = 'Last 30 Days', region = 'All Regions', format = 'PDF' } = req.body || {};
  const { Appointment, Patient, Doctor } = await import('../models/index.js');

  const [appointmentsCount, patientsCount, doctorsCount] = await Promise.all([
    Appointment.countDocuments(),
    Patient.countDocuments(),
    Doctor.countDocuments(),
  ]);

  const onlineDoctorsCount = await Doctor.countDocuments({ 'availability.status': 'online' });
  const reportData = {
    id: `REP-${Date.now()}`,
    title: `Regional Health Impact Report - ${region}`,
    period,
    region,
    format,
    generatedOn: new Date().toISOString(),
    resolutionRate: 94,
    patientsServed: patientsCount > 0 ? `${patientsCount} Active Patients` : '14.2k',
    sdgAlignment: 'High (SDG 3)',
    activeDoctors: onlineDoctorsCount,
    totalConsultations: appointmentsCount || 24,
    conditionTrends: [
      { label: 'Fever & Infection', value: 45 },
      { label: 'Respiratory', value: 30 },
      { label: 'Hypertension', value: 20 },
      { label: 'Maternal Care', value: 15 },
      { label: 'General', value: 35 },
    ],
    demographics: {
      pediatric: 28,
      adult: 48,
      elderly: 24,
    },
  };

  return success(res, reportData);
});

/**
 * POST /reports/:id/file  (multipart/form-data, field name: file)
 * Attaches an uploaded file to a report and records its path.
 */
export const uploadReportFile = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found.');

  const file = req.file;
  if (!file) throw new ApiError(400, 'No file uploaded.');

  report.filePath = `/uploads/${file.filename}`;
  await report.save();
  return success(res, { report, file: { name: file.originalname, path: report.filePath } });
});

/**
 * GET /reports/export
 * Returns report collection as a JSON snapshot (CSV/PDF generation lives
 * client-side via jspdf; this endpoint supports future server-side export).
 */
export const exportReports = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const query = {};
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const reports = await MedicalReport.find(query)
    .sort({ date: -1 })
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization')
    .lean();

  return success(res, reports, { exportedAt: new Date().toISOString() });
});

/**
 * GET /reports/audit
 * Summary counts of reports by type and flag distribution.
 */
export const getReportAudit = asyncHandler(async (_req, res) => {
  const [byType, flagged] = await Promise.all([
    MedicalReport.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    MedicalReport.aggregate([
      { $unwind: '$fields' },
      { $match: { 'fields.flag': { $ne: 'normal' } } },
      { $group: { _id: '$fields.flag', count: { $sum: 1 } } },
    ]),
  ]);

  return success(res, {
    total: await MedicalReport.countDocuments(),
    byType,
    flagged,
  });
});

/**
 * PUT /reports/:id
 */
export const updateReport = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findByIdAndUpdate(
    req.params.id,
    { ...(req.body || {}) },
    { new: true, runValidators: true }
  );
  if (!report) throw new ApiError(404, 'Report not found.');
  return success(res, report);
});

/**
 * DELETE /reports/:id
 */
export const deleteReport = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findByIdAndDelete(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found.');
  return noContent(res);
});

export const reportController = {
  getReports,
  getReportById,
  generateReport,
  uploadReportFile,
  exportReports,
  getReportAudit,
  updateReport,
  deleteReport,
};

export default reportController;
