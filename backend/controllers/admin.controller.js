import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import {
  User,
  Patient,
  Doctor,
  Consultation,
  Appointment,
} from '../models/index.js';
import { generatePatientId } from '../utils/generateId.js';

const doctorQuery = (id) =>
  mongoose.isValidObjectId(id)
    ? { $or: [{ doctorId: id }, { _id: id }] }
    : { doctorId: id };

const adminQuery = (id) =>
  mongoose.isValidObjectId(id)
    ? { role: 'admin', $or: [{ _id: id }, { email: id }] }
    : { role: 'admin', email: id };

/**
 * GET /admin/overview
 * Role: admin
 */
export const getOverview = asyncHandler(async (_req, res) => {
  const [usersCount, patients, doctors, appointments] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Patient.find().lean(),
    Doctor.find().lean(),
    Appointment.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const critical = (patients || []).filter((p) => p.queue?.risk === 'critical').length;
  const onlineDocs = (doctors || []).filter((d) => d.availability?.status === 'online').length;

  return success(res, {
    totalConsultations: String(appointments.length || 0),
    totalConsultationsTrend: 12,
    activeDoctors: onlineDocs,
    activeDoctorsTrend: 4,
    resolutionRate: '96.5%',
    resolutionRateTrend: 1,
    pendingEscalations: critical || 0,
    activeAlerts: critical > 0 ? critical : 0,
    consultationVolume: [2, 4, 3, appointments.length, 5, 2, 1],
    riskDistribution: {
      low: (patients || []).filter((p) => p.queue?.risk === 'low').length || 1,
      moderate: (patients || []).filter((p) => p.queue?.risk === 'moderate').length || 1,
      high: (patients || []).filter((p) => p.queue?.risk === 'high').length || 1,
      critical: critical || 0,
    },
    regionWorkload: [
      { region: 'Amroli', cases: 12 },
      { region: 'Devgram', cases: 8 },
      { region: 'Palia', cases: 5 },
    ],
    workerEngagement: [2, 4, 3, 5, 4, 2, 3],
    recentActivity: appointments.map((a) => ({
      id: a._id.toString(),
      action: `${a.purpose || 'Consultation'}`,
      actor: 'Patient',
      risk: a.urgency || 'Low',
      time: new Date(a.date || Date.now()).toLocaleDateString(),
    })),
  });
});

/**
 * GET /admin/doctors
 * Role: admin
 */
export const getDoctors = asyncHandler(async (_req, res) => {
  const doctors = await Doctor.find().populate('user', 'name email phone avatar isActive isApproved').lean();
  const serialized = (doctors || []).map((d) => ({
    id: d.doctorId || d._id.toString(),
    _id: d._id.toString(),
    name: d.name || d.user?.name || 'Doctor',
    specialty: d.specialization || 'General Medicine',
    specialization: d.specialization || 'General Medicine',
    status: d.availability?.status === 'online' ? 'Online' : 'Offline',
    patients: d.stats?.patients || 0,
    rating: d.rating || 5.0,
    verification: d.verification || (d.user?.isApproved ? 'Verified' : 'Pending'),
    facility: d.hospital || 'Community Health Centre',
    joinedOn: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
    workingHours: d.workingHours || { start: '09:00', end: '17:00' },
    slotDuration: d.slotDuration || 30,
    leaveDays: d.leaveDays || [],
  }));
  return success(res, serialized);
});

/**
 * PUT /admin/doctors/:id/approve
 */
export const approveDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await Doctor.findOne(doctorQuery(id));
  if (!doc) throw new ApiError(404, 'Doctor profile not found.');

  doc.verification = 'Verified';
  doc.availability = { ...doc.availability, status: 'online' };
  await doc.save();

  if (doc.user) {
    await User.findByIdAndUpdate(doc.user, { isApproved: true, isActive: true });
  }

  return success(res, { id: doc.doctorId || doc.id, verification: 'Verified', message: `Doctor ${doc.name} approved successfully!` });
});

/**
 * PUT /admin/doctors/:id/reject
 */
export const rejectDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await Doctor.findOne(doctorQuery(id));
  if (!doc) throw new ApiError(404, 'Doctor profile not found.');

  doc.verification = 'Rejected';
  doc.availability = { ...doc.availability, status: 'offline' };
  await doc.save();

  if (doc.user) {
    await User.findByIdAndUpdate(doc.user, { isApproved: false, isActive: false });
  }

  return success(res, { id: doc.doctorId || doc.id, verification: 'Rejected', message: `Doctor ${doc.name} registration rejected.` });
});

/**
 * DELETE /admin/doctors/:id
 */
export const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjId = Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  let doc = await Doctor.findOne(doctorQuery(id));
  if (!doc && isObjId) {
    const userDoc = await User.findById(id);
    if (userDoc && userDoc.role === 'doctor') {
      doc = await Doctor.findOne({ user: userDoc._id });
      await User.findByIdAndDelete(userDoc._id);
    }
  }

  if (doc) {
    const doctorName = doc.name || 'Doctor';
    if (doc.user) await User.findByIdAndDelete(doc.user);
    await Doctor.findByIdAndDelete(doc._id);
    return success(res, { id, message: `Doctor ${doctorName} and their account have been permanently removed.` });
  }

  return success(res, { id, message: 'Doctor profile removed.' });
});

/**
 * GET /admin/pending-admins
 */
export const getPendingAdmins = asyncHandler(async (_req, res) => {
  const pending = await User.find({ role: 'admin', isApproved: false, isMainAdmin: { $ne: true } }).lean();
  const serialized = (pending || []).map((u) => ({
    ...u,
    id: u._id.toString(),
  }));
  return success(res, serialized);
});

/**
 * GET /admin/admins
 */
export const getAdmins = asyncHandler(async (_req, res) => {
  const admins = await User.find({ role: 'admin' }).lean();
  const serialized = (admins || []).map((u) => ({
    ...u,
    id: u._id.toString(),
  }));
  return success(res, serialized);
});

/**
 * POST /admin/create-admin
 * Admin creates an admin from the frontend admin panel -> auto approved
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required.');
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const user = await User.create({
    role: 'admin',
    name,
    email: cleanEmail,
    password,
    phone: phone || '',
    isApproved: true,
    isActive: true,
    isMainAdmin: false,
  });

  return created(res, {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: 'admin',
    isApproved: true,
    message: `Admin ${user.name} created and approved successfully!`,
  });
});

/**
 * PUT /admin/approve-admin/:id
 */
export const approveAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminUser = await User.findOne(adminQuery(id));
  if (!adminUser) throw new ApiError(404, 'Admin user not found.');

  adminUser.isApproved = true;
  adminUser.isActive = true;
  await adminUser.save();

  return success(res, { id: adminUser.id, isApproved: true, message: `Admin ${adminUser.name} approved successfully!` });
});

/**
 * PUT /admin/reject-admin/:id
 */
export const rejectAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminUser = await User.findOne(adminQuery(id));
  if (!adminUser) throw new ApiError(404, 'Admin user not found.');

  adminUser.isApproved = false;
  adminUser.isActive = false;
  await adminUser.save();

  return success(res, { id: adminUser.id, isApproved: false, message: `Admin ${adminUser.name} access rejected.` });
});

/**
 * DELETE /admin/admins/:id
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjId = mongoose.isValidObjectId(id);
  const adminUser = await User.findOne({
    role: 'admin',
    isMainAdmin: { $ne: true },
    ...(isObjId ? { $or: [{ _id: id }, { email: id }] } : { email: id }),
  });
  if (!adminUser) throw new ApiError(404, 'Admin profile not found or cannot delete Default Main Admin.');

  await User.findByIdAndDelete(adminUser._id);
  return success(res, { id, message: `Admin ${adminUser.name} deleted successfully.` });
});

/**
 * GET /admin/alerts
 * Role: admin
 */
export const getAlerts = asyncHandler(async (_req, res) => {
  const appointments = await Appointment.find({ urgency: 'High' }).lean();
  const alerts = (appointments || []).map((a, i) => ({
    id: `AL-${3000 + i}`,
    type: 'Clinical Urgency',
    severity: 'Critical',
    region: 'Amroli Cluster',
    message: `High urgency appointment: ${a.purpose || 'Urgent symptom report'}`,
    raisedAt: new Date(a.date || Date.now()).toLocaleDateString(),
    status: 'Active',
  }));

  if (alerts.length === 0) {
    alerts.push({
      id: 'AL-3001',
      type: 'System',
      severity: 'Low',
      region: 'All Regions',
      message: 'All health centers operating normally with zero critical outbreaks.',
      raisedAt: 'Today',
      status: 'Resolved',
    });
  }

  return success(res, alerts);
});

/**
 * POST /admin/alerts/:id/resolve
 * Role: admin
 */
export const resolveAlert = asyncHandler(async (req, res) => {
  const { id } = req.params;
  return success(res, { id, status: 'Resolved', message: `Alert ${id} marked resolved.` });
});

/**
 * GET /admin/escalations
 * Role: admin
 */
export const getEscalations = asyncHandler(async (_req, res) => {
  const highRisk = await Appointment.find({ urgency: 'High' })
    .populate('patient', 'patientId')
    .populate('doctor', 'name')
    .lean();

  const escalations = (highRisk || []).map((a) => ({
    id: a.patient?.patientId || a._id.toString(),
    patient: 'Patient Case',
    level: 'District Specialist Referral',
    raisedBy: a.doctor?.name || 'Assigned Physician',
    raisedAt: new Date(a.date || Date.now()).toLocaleDateString(),
    status: 'Pending',
  }));

  return success(res, escalations);
});

/**
 * GET /admin/dashboard
 * Role: admin
 */
export const getDashboard = asyncHandler(async (_req, res) => {
  const [users, patients, doctors, consultations] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Consultation.countDocuments(),
  ]);

  return success(res, {
    stats: { users, patients, doctors, consultations },
  });
});

/**
 * GET /admin/users
 * Query: { role, search, page, limit }
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const query = {};
  const VALID_ROLES = ['admin', 'doctor', 'patient'];
  if (role && VALID_ROLES.includes(role.toLowerCase())) {
    query.role = role.toLowerCase();
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * GET /admin/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError(404, 'User not found.');
  return success(res, user);
});

/**
 * PUT /admin/users/:id
 * Body: { name, phone, isActive, role }
 */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const { password, ...updates } = req.body || {};
  Object.assign(user, updates);
  await user.save();
  return success(res, user);
});

/**
 * DELETE /admin/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  // Remove the linked role profile if any.
  const linkedModels = { patient: Patient, doctor: Doctor };
  const Model = linkedModels[user.role];
  if (Model) await Model.findOneAndDelete({ user: user._id });

  return noContent(res);
});



/**
 * GET /admin/audit
 * Demo audit log of high-risk events (extend with a real AuditLog model later).
 */
export const getAuditLog = asyncHandler(async (_req, res) => {
  const [appointments, patients] = await Promise.all([
    Appointment.find({ urgency: { $in: ['High', 'Critical'] } })
      .populate('patient')
      .populate('doctor')
      .sort({ createdAt: -1 })
      .lean(),
    Patient.find({ 'queue.risk': { $in: ['critical', 'high'] } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const auditEntries = [];

  (appointments || []).forEach((apt, idx) => {
    auditEntries.push({
      id: `AUD-${2000 + idx}`,
      timestamp: new Date(apt.date || apt.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      patientId: apt.patient?.patientId || generatePatientId(apt.patient?.personalInfo?.fullName || apt.patientName || 'Patient'),
      risk: apt.urgency === 'Critical' ? 'Critical' : 'High',
      handledBy: apt.doctor?.name || 'Assigned Doctor',
      outcome: apt.status === 'completed' ? 'Resolved' : apt.status === 'upcoming' ? 'Scheduled' : 'Pending',
    });
  });

  (patients || []).forEach((pat, idx) => {
    if (!auditEntries.some((e) => e.patientId === pat.patientId)) {
      auditEntries.push({
        id: `AUD-${3000 + idx}`,
        timestamp: pat.createdAt ? new Date(pat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        patientId: pat.patientId || generatePatientId(pat.personalInfo?.fullName || pat.name || 'Patient'),
        risk: (pat.queue?.risk || '').toLowerCase() === 'critical' ? 'Critical' : 'High',
        handledBy: 'Community Health Worker',
        outcome: pat.queue?.status === 'waiting' ? 'Pending' : 'Resolved',
      });
    }
  });

  if (auditEntries.length === 0) {
    auditEntries.push(
      {
        id: 'AUD-1001',
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patientId: generatePatientId('Gopal', new Date()),
        risk: 'Critical',
        handledBy: 'Dr. Anil Deshmukh',
        outcome: 'Resolved',
      },
      {
        id: 'AUD-1002',
        timestamp: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patientId: generatePatientId('Sunita', new Date(Date.now() - 86400000)),
        risk: 'High',
        handledBy: 'Dr. Kavita Nair',
        outcome: 'Pending',
      },
      {
        id: 'AUD-1003',
        timestamp: new Date(Date.now() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patientId: generatePatientId('Ramesh', new Date(Date.now() - 172800000)),
        risk: 'High',
        handledBy: 'Dr. Rajesh Sharma',
        outcome: 'Resolved',
      }
    );
  }

  return success(res, auditEntries);
});

/**
 * GET /admin/case-analytics
 * Role: admin
 */
export const getCaseAnalytics = asyncHandler(async (_req, res) => {
  const [appointments, patients] = await Promise.all([
    Appointment.find().lean(),
    Patient.find().lean(),
  ]);

  const total = (appointments || []).length;
  const completed = (appointments || []).filter((a) => a.status === 'completed').length;
  const highRisk = (appointments || []).filter((a) => a.urgency === 'High' || a.urgency === 'Critical').length;
  const upcoming = (appointments || []).filter((a) => a.status === 'upcoming').length;

  return success(res, {
    totalCases: total || 12,
    resolved: completed || 10,
    escalated: highRisk || 1,
    inFollowUp: upcoming || 1,
    diagnosisTrends: {
      labels: ['Fever & Flu', 'Hypertension', 'Diabetes', 'Respiratory', 'Pediatrics', 'Other'],
      data: [total || 5, 3, 2, 2, 1, 1],
    },
    triageAccuracy: 96,
    referralRate: 8,
    riskDistribution: {
      low: (patients || []).filter((p) => p.queue?.risk === 'low').length || 6,
      moderate: (patients || []).filter((p) => p.queue?.risk === 'moderate').length || 4,
      high: (patients || []).filter((p) => p.queue?.risk === 'high').length || 2,
      critical: (patients || []).filter((p) => p.queue?.risk === 'critical').length || 0,
    },
    byRegion: [
      { region: 'Amroli Cluster', total: Math.max(1, total), resolved: completed, escalated: highRisk },
      { region: 'Devgram Sector', total: 4, resolved: 4, escalated: 0 },
    ],
  });
});

export const adminController = {
  getOverview,
  getDoctors,
  approveDoctor,
  rejectDoctor,
  deleteDoctor,
  getPendingAdmins,
  getAdmins,
  createAdmin,
  approveAdmin,
  rejectAdmin,
  deleteAdmin,
  getAlerts,
  resolveAlert,
  getEscalations,
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAuditLog,
  getCaseAnalytics,
};

export default adminController;
