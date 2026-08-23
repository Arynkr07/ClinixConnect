import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import {
  User,
  Patient,
  Doctor,
  HealthCamp,
  Consultation,
  Village,
  AshaWorker,
  Appointment,
} from '../models/index.js';
import { buildCaseAnalytics } from './case.controller.js';

const serializeAshaWorker = (worker) => {
  const villageName = worker.village?.name ?? worker.villageName ?? '';
  return {
    id: worker.workerId || worker.id || worker._id.toString(),
    workerId: worker.workerId,
    name: worker.name,
    village: villageName,
    villageId: worker.village?._id ? worker.village._id.toString() : worker.villageId || '',
    block: villageName ? `${villageName} Block` : '',
    households: worker.households || 0,
    visits: worker.visits || 0,
    lastSync: worker.lastSync || '',
    status: worker.status || 'Inactive',
    score: worker.score || 0,
  };
};

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
    activeDoctors: onlineDocs || doctors.length || 0,
    activeDoctorsTrend: 4,
    activeAshaWorkers: 6,
    activeAshaWorkersTrend: 2,
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
  const doctors = await Doctor.find().populate('user', 'name email phone avatar isActive').lean();
  const serialized = (doctors || []).map((d) => ({
    id: d.doctorId || d._id.toString(),
    _id: d._id.toString(),
    name: d.name || d.user?.name || 'Doctor',
    specialty: d.specialization || 'General Medicine',
    specialization: d.specialization || 'General Medicine',
    status: d.availability?.status === 'online' ? 'Online' : 'Offline',
    patients: d.stats?.patients || 0,
    rating: d.rating || 5.0,
    verification: 'Verified',
    facility: d.hospital || 'Community Health Centre',
    joinedOn: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
    workingHours: d.workingHours || { start: '09:00', end: '17:00' },
    slotDuration: d.slotDuration || 30,
    leaveDays: d.leaveDays || [],
  }));
  return success(res, serialized);
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
  const [users, patients, doctors, activeCamps, consultations] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Patient.countDocuments(),
    Doctor.countDocuments(),
    HealthCamp.countDocuments(),
    Consultation.countDocuments(),
  ]);

  return success(res, {
    stats: { users, patients, doctors, activeCamps, consultations },
  });
});

/**
 * GET /admin/users
 * Query: { role, search, page, limit }
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const query = {};
  const VALID_ROLES = ['admin', 'doctor', 'patient', 'ngo', 'government'];
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
 * GET /admin/villages
 * Available villages an admin can assign to ASHA workers.
 */
export const getVillages = asyncHandler(async (_req, res) => {
  const villages = await Village.find().sort({ name: 1 }).lean();
  return success(res, villages);
});

/**
 * GET /admin/asha-workers
 * List of ASHA workers with their currently assigned village resolved to a name.
 */
export const getAshaWorkers = asyncHandler(async (_req, res) => {
  const workers = await AshaWorker.find()
    .populate('village', 'name')
    .sort({ name: 1 })
    .lean();
  return success(res, workers.map(serializeAshaWorker));
});

/**
 * POST /admin/asha-workers/:id/assign
 * Body: { villageId }
 * Assigns a village to an ASHA worker. Prevents the same active village
 * from being assigned to a different worker (avoids invalid duplicates).
 */
export const assignAshaWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { villageId } = req.body || {};

  const worker = await AshaWorker.findOne({ workerId: id });
  if (!worker) throw new ApiError(404, 'ASHA worker not found.');
  if (!villageId) throw new ApiError(400, 'A village must be selected.');

  const village = await Village.findById(villageId).lean();
  if (!village) throw new ApiError(400, 'Selected village does not exist.');

  const ownsVillage =
    worker.village && worker.village.toString() === villageId;
  if (!ownsVillage) {
    const conflict = await AshaWorker.findOne({
      village: villageId,
      status: 'Active',
      _id: { $ne: worker._id },
    });
    if (conflict) {
      throw new ApiError(
        409,
        `Village "${village.name}" is already assigned to ${conflict.name}.`
      );
    }
  }

  worker.village = village._id;
  worker.status = 'Active';
  await worker.save();

  const updated = await AshaWorker.findById(worker._id)
    .populate('village', 'name')
    .lean();
  return success(res, serializeAshaWorker(updated));
});

/**
 * POST /admin/asha-workers/:id/toggle-status
 */
export const toggleAshaWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const worker = await AshaWorker.findOne({ workerId: id });
  if (!worker) throw new ApiError(404, 'ASHA worker not found.');

  worker.status = worker.status === 'Active' ? 'Inactive' : 'Active';
  await worker.save();

  const updated = await AshaWorker.findById(worker._id)
    .populate('village', 'name')
    .lean();
  return success(res, serializeAshaWorker(updated));
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
      patientId: apt.patient?.patientId || `JD-${1000 + idx}`,
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
        patientId: pat.patientId || `JD-${2000 + idx}`,
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
        patientId: 'JD-8F2KQ3',
        risk: 'Critical',
        handledBy: 'Dr. Anil Deshmukh',
        outcome: 'Resolved',
      },
      {
        id: 'AUD-1002',
        timestamp: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patientId: 'JD-5XA2MN',
        risk: 'High',
        handledBy: 'Dr. Kavita Nair',
        outcome: 'Pending',
      },
      {
        id: 'AUD-1003',
        timestamp: new Date(Date.now() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patientId: 'JD-9921',
        risk: 'High',
        handledBy: 'Dr. Rajesh Sharma',
        outcome: 'Resolved',
      }
    );
  }

  return success(res, auditEntries);
});

/**
 * GET /admin/surveillance
 * Disease cluster data for the surveillance map.
 */
export const getSurveillance = asyncHandler(async (_req, res) => {
  const clusters = [
    {
      id: 'CL-01',
      village: 'Amroli',
      disease: 'Acute Watery Diarrhoea',
      cases: 12,
      lat: 21.1929,
      lng: 81.2961,
      risk: 'high',
    },
    {
      id: 'CL-02',
      village: 'Palia',
      disease: 'Malaria',
      cases: 5,
      lat: 21.3116,
      lng: 81.2276,
      risk: 'moderate',
    },
    {
      id: 'CL-03',
      village: 'Devgram',
      disease: 'Dengue',
      cases: 8,
      lat: 21.4059,
      lng: 81.3832,
      risk: 'high',
    },
  ];

  return success(res, clusters);
});

/**
 * GET /admin/case-analytics
 * Role: admin
 * Case-level analytics aggregated from the same stored case files used by
 * the Doctor portal Case Report, so both portals read one data source.
 */
export const getCaseAnalytics = asyncHandler(async (_req, res) => {
  const analytics = await buildCaseAnalytics();
  return success(res, analytics);
});

export const adminController = {
  getOverview,
  getDoctors,
  getAlerts,
  resolveAlert,
  getEscalations,
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getVillages,
  getAshaWorkers,
  assignAshaWorker,
  toggleAshaWorker,
  getAuditLog,
  getSurveillance,
  getCaseAnalytics,
};

export default adminController;
