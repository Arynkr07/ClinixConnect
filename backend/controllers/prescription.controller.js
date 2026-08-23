import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { Prescription } from '../models/index.js';
import { notificationService } from '../services/notification.service.js';

/**
 * GET /prescriptions
 * Query: { patient, doctor, status, page, limit }
 */
export const getPrescriptions = asyncHandler(async (req, res) => {
  const { patient, doctor, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (doctor) query.doctor = doctor;
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    Prescription.find(query)
      .sort({ issuedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('patient', 'patientId personalInfo')
      .populate('doctor', 'name specialization')
      .lean(),
    Prescription.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /prescriptions/:id
 */
export const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization')
    .lean();
  if (!prescription) throw new ApiError(404, 'Prescription not found.');
  return success(res, prescription);
});

/**
 * POST /prescriptions
 * Body: { patient, doctor, diagnosis, advice, medicines: [...], status? }
 */
export const createPrescription = asyncHandler(async (req, res) => {
  const { patient, doctor, medicines } = req.body || {};
  if (!patient || !doctor) {
    throw new ApiError(400, 'Prescription requires a patient and doctor.');
  }
  if (!Array.isArray(medicines) || medicines.length === 0) {
    throw new ApiError(400, 'Prescription must contain at least one medicine.');
  }

  const prescription = await Prescription.create(req.body);
  const populated = await Prescription.findById(prescription._id)
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization');

  try {
    const patientDoc = populated.patient;
    if (patientDoc?.user) {
      await notificationService.notify({
        userIds: patientDoc.user,
        title: 'New prescription available',
        description: `Prescription ${populated.prescriptionId} has been issued to you.`,
        type: 'prescription',
        link: '/patient/prescriptions',
      });
    }
  } catch (error) {
    console.warn('[prescription] notification skipped:', error.message);
  }

  return created(res, populated);
});

/**
 * PUT /prescriptions/:id
 */
export const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findByIdAndUpdate(
    req.params.id,
    { ...(req.body || {}) },
    { new: true, runValidators: true }
  )
    .populate('patient', 'patientId personalInfo')
    .populate('doctor', 'name specialization');
  if (!prescription) throw new ApiError(404, 'Prescription not found.');
  return success(res, prescription);
});

/**
 * POST /prescriptions/:id/dispense
 * Marks a prescription as dispensed (pharmacy flow).
 */
export const dispensePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw new ApiError(404, 'Prescription not found.');

  prescription.status = 'dispensed';
  await prescription.save();
  return success(res, prescription);
});

/**
 * DELETE /prescriptions/:id
 */
export const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findByIdAndDelete(req.params.id);
  if (!prescription) throw new ApiError(404, 'Prescription not found.');
  return noContent(res);
});

export const prescriptionController = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  dispensePrescription,
  deletePrescription,
};

export default prescriptionController;
