import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { Doctor, Patient, Consultation, User } from '../models/index.js';
import { dashboardService } from '../services/dashboard.service.js';

/**
 * GET /doctor/dashboard
 * Role: doctor
 */
export const getDashboard = asyncHandler(async (req, res) => {
  let doctor = await Doctor.findOne({ user: req.user._id }).lean();
  if (!doctor) {
    doctor = await Doctor.create({
      user: req.user._id,
      name: req.user.name || 'Doctor',
      doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
      email: req.user.email || '',
      phone: req.user.phone || '',
      specialization: 'General Medicine',
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      leaveDays: [],
      availability: { status: 'online' },
    });
  }

  const [dashboard, queue, recent] = await Promise.all([
    dashboardService.buildDoctorDashboard({ doctorId: doctor._id }),
    Patient.find({ 'queue.status': { $in: ['waiting', 'inReview'] } })
      .sort({ 'queue.joinedAt': 1 })
      .limit(10)
      .populate('user', 'name')
      .lean(),
    Consultation.find({ doctor: doctor._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'patientId')
      .lean(),
  ]);

  return success(res, {
    doctor,
    stats: dashboard?.stats || {
      totalPatients: 0,
      patientsToday: 0,
      urgentCases: 0,
      avgResponse: '10m',
      followUps: 0,
      consultations: [0, 0, 0, 0, 0, 0, 0],
      outcomes: [0, 0, 0],
    },
    queue: (queue || []).map((p) => ({ id: p.patientId, name: p.user?.name, ...p.queue })),
    recentConsultations: recent || [],
  });
});

/**
 * GET /doctors
 * Role: admin, doctor, patient, ngo, government
 * Query: { specialization, status, search, page, limit }
 */
export const getDoctors = asyncHandler(async (req, res) => {
  const { specialization, status, search } = req.query;

  // Auto-sync any doctor users in MongoDB who don't have a Doctor profile yet
  try {
    const doctorUsers = await User.find({ role: 'doctor' }).lean();
    for (const u of doctorUsers) {
      const exists = await Doctor.findOne({ user: u._id });
      if (!exists) {
        await Doctor.create({
          user: u._id,
          doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          specialization: 'General Medicine',
          hospital: 'District Health Centre',
          workingHours: { start: '09:00', end: '17:00' },
          slotDuration: 30,
          leaveDays: [],
          availability: { status: 'online' },
        });
      }
    }
  } catch (e) {
    /* ignore sync error */
  }

  const query = {};
  if (specialization && specialization !== 'All') {
    query.specialization = { $regex: new RegExp(`^${specialization}$`, 'i') };
  }
  if (status) query['availability.status'] = status.toLowerCase();
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { specialization: { $regex: search, $options: 'i' } },
      { doctorId: { $regex: search, $options: 'i' } },
      { hospital: { $regex: search, $options: 'i' } },
    ];
  }

  const items = await Doctor.find(query).sort({ name: 1 }).lean();

  const serialized = (items || []).map((d) => ({
    id: d.doctorId || d.id || d._id.toString(),
    doctorId: d.doctorId || d._id.toString(),
    _id: d._id.toString(),
    name: d.name,
    specialty: d.specialization || 'General Medicine',
    specialization: d.specialization || 'General Medicine',
    hospital: d.hospital || 'District Health Centre',
    facility: d.hospital || 'District Health Centre',
    status: d.availability?.status === 'online' ? 'Online' : 'Offline',
    email: d.email || '',
    phone: d.phone || '',
    patients: d.stats?.patients || 0,
    rating: d.rating || 4.9,
    workingHours: d.workingHours || { start: '09:00', end: '17:00' },
    slotDuration: d.slotDuration || 30,
    leaveDays: d.leaveDays || [],
  }));

  return success(res, serialized, { total: serialized.length });
});

/**
 * GET /doctors/:id
 */
export const getDoctorById = asyncHandler(async (req, res) => {
  const query = req.params.id.startsWith('dr-')
    ? { doctorId: req.params.id }
    : { _id: req.params.id };

  let doctor = await Doctor.findOne(query)
    .populate('user', 'name email phone avatar')
    .lean();

  if (!doctor) {
    doctor = await Doctor.findById(req.params.id).lean();
  }

  if (!doctor) throw new ApiError(404, 'Doctor not found.');

  const serialized = {
    id: doctor.doctorId || doctor.id || doctor._id.toString(),
    doctorId: doctor.doctorId || doctor._id.toString(),
    _id: doctor._id.toString(),
    name: doctor.name,
    specialty: doctor.specialization || 'General Medicine',
    specialization: doctor.specialization || 'General Medicine',
    hospital: doctor.hospital || 'District Health Centre',
    facility: doctor.hospital || 'District Health Centre',
    status: doctor.availability?.status === 'online' ? 'Online' : 'Offline',
    email: doctor.email || '',
    phone: doctor.phone || '',
    rating: doctor.rating || 4.9,
    workingHours: doctor.workingHours || { start: '09:00', end: '17:00' },
    slotDuration: doctor.slotDuration || 30,
    leaveDays: doctor.leaveDays || [],
  };

  return success(res, serialized);
});

/**
 * GET /doctors/:id/profile  (alias for the doctor's own profile)
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  let doctor = await Doctor.findOne({ user: req.user._id })
    .populate('user', 'name email phone avatar')
    .lean();

  if (!doctor) {
    doctor = await Doctor.create({
      user: req.user._id,
      name: req.user.name || 'Doctor',
      doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
      email: req.user.email || '',
      phone: req.user.phone || '',
      specialization: 'General Medicine',
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      leaveDays: [],
      availability: { status: 'online' },
    });
  }

  return success(res, doctor);
});

/**
 * POST /doctors
 * Body: { name, email, specialization, hospital, workingHours, slotDuration, ... }
 */
export const createDoctor = asyncHandler(async (req, res) => {
  const { user, name, email, specialty, specialization, hospital, facility, phone, workingHours, slotDuration, ...rest } = req.body || {};
  if (!name) {
    throw new ApiError(400, 'Doctor requires a name.');
  }

  let userId = user;
  if (!userId) {
    // Find or create User in MongoDB for this doctor
    const cleanEmail = (email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@jeevandoot.org`).trim().toLowerCase();
    let existingUser = await User.findOne({ email: cleanEmail });
    if (!existingUser) {
      existingUser = await User.create({
        role: 'doctor',
        name,
        email: cleanEmail,
        password: 'doctor12345',
        phone: phone || '',
      });
    }
    userId = existingUser._id;
  }

  let doctor = await Doctor.findOne({ user: userId });
  if (doctor) {
    Object.assign(doctor, {
      name,
      specialization: specialization || specialty || doctor.specialization,
      hospital: hospital || facility || doctor.hospital,
      phone: phone || doctor.phone,
      workingHours: workingHours || doctor.workingHours,
      slotDuration: slotDuration || doctor.slotDuration,
      ...rest,
    });
    await doctor.save();
  } else {
    doctor = await Doctor.create({
      user: userId,
      doctorId: `dr-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      email: email || '',
      specialization: specialization || specialty || 'General Medicine',
      hospital: hospital || facility || 'District Health Centre',
      phone: phone || '',
      workingHours: workingHours || { start: '09:00', end: '17:00' },
      slotDuration: slotDuration || 30,
      leaveDays: [],
      availability: { status: 'online' },
      ...rest,
    });
  }

  return created(res, doctor);
});

/**
 * PUT /doctors/:id
 * Updates profile fields; user's linked name can be updated too.
 */
export const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found.');

  const { user, ...updates } = req.body || {};
  Object.assign(doctor, updates);
  await doctor.save();

  return success(res, doctor);
});

/**
 * PUT /doctors/me/availability
 * Role: doctor
 * Body: { status: 'online'|'offline'|'busy' }
 * The doctor manages their own online/offline presence.
 */
export const updateMyAvailability = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['online', 'offline', 'busy'].includes(status)) {
    throw new ApiError(400, "Availability status must be 'online', 'offline' or 'busy'.");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found.');

  doctor.availability.status = status;
  await doctor.save();

  return success(res, { id: doctor._id, availability: doctor.availability });
});

/**
 * POST /doctors/:id/toggle-status
 * Body: { status?: 'online'|'offline'|'busy' } — toggles if omitted.
 * NOTE: Admin may verify a doctor but cannot control presence; a doctor can
 * only toggle their own presence via /doctors/me/availability.
 */
export const toggleDoctorStatus = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found.');

  if (req.user?.role === 'doctor' && String(doctor.user) !== String(req.user._id)) {
    throw new ApiError(403, 'A doctor can only update their own availability.');
  }

  const next =
    req.body?.status ||
    (doctor.availability.status === 'online' ? 'offline' : 'online');
  doctor.availability.status = next;
  await doctor.save();

  return success(res, { id: doctor._id, availability: doctor.availability });
});

/**
 * DELETE /doctors/:id
 */
export const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found.');
  return noContent(res);
});

/**
 * GET /doctors/:id/available-slots
 * Query: { date }
 */
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!date) throw new ApiError(400, 'Query parameter "date" is required (YYYY-MM-DD).');

  const query = id.startsWith('dr-')
    ? { doctorId: id }
    : { $or: [{ doctorId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] };

  let doctor = await Doctor.findOne(query).lean();
  if (!doctor) {
    doctor = await Doctor.findById(id).lean();
  }

  if (!doctor) {
    doctor = {
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      leaveDays: [],
    };
  }

  const targetDateStr = String(date).slice(0, 10);
  const targetDate = new Date(targetDateStr);

  // Check if doctor is on leave
  const isLeave = (doctor.leaveDays || []).some((l) => String(new Date(l).toISOString()).slice(0, 10) === targetDateStr);
  if (isLeave) {
    return success(res, { isDoctorOnLeave: true, slots: [] });
  }

  // Parse working hours
  const parseMin = (t) => {
    const [h, m] = (t || '09:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  const startMin = parseMin(doctor.workingHours?.start || '09:00');
  const endMin = parseMin(doctor.workingHours?.end || '17:00');
  const duration = doctor.slotDuration || 30;

  const generated = [];
  for (let curr = startMin; curr + duration <= endMin; curr += duration) {
    generated.push({
      startTime: fmt(curr),
      endTime: fmt(curr + duration),
    });
  }

  // Find existing appointments for this doctor on target date
  const { Appointment } = await import('../models/index.js');
  const dayStart = new Date(targetDateStr);
  const dayEnd = new Date(targetDateStr);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    doctor: doctor._id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['upcoming', 'completed'] },
  }).select('startTime').lean();

  const bookedSet = new Set(bookedAppointments.map((a) => a.startTime));

  const slots = generated.map((slot) => ({
    ...slot,
    isAvailable: !bookedSet.has(slot.startTime),
  }));

  return success(res, { isDoctorOnLeave: false, slots });
});

/**
 * POST /doctors/:id/leave
 * Body: { date, reason? }
 */
export const markLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, reason = '' } = req.body || {};
  if (!date) throw new ApiError(400, 'Leave date is required.');

  const doctor = await Doctor.findById(id);
  if (!doctor) throw new ApiError(404, 'Doctor not found.');

  const leaveDateObj = new Date(String(date).slice(0, 10));
  const leaveDateStr = leaveDateObj.toISOString().slice(0, 10);

  if (!doctor.leaveDays) doctor.leaveDays = [];
  const exists = doctor.leaveDays.some((l) => new Date(l).toISOString().slice(0, 10) === leaveDateStr);
  if (!exists) {
    doctor.leaveDays.push(leaveDateObj);
    await doctor.save();
  }

  // Find and cancel affected appointments on that date
  const { Appointment, User } = await import('../models/index.js');
  const { emailService } = await import('../services/email.service.js');

  const dayStart = new Date(leaveDateStr);
  const dayEnd = new Date(leaveDateStr);
  dayEnd.setHours(23, 59, 59, 999);

  const affected = await Appointment.find({
    doctor: doctor._id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: 'upcoming',
  }).populate('patient');

  for (const apt of affected) {
    apt.status = 'cancelled';
    apt.cancelledAt = new Date();
    apt.cancelledReason = `Doctor on leave: ${reason || 'Scheduled leave'}`;
    await apt.save();

    // Trigger email & in-app notification to affected patient
    try {
      const { notificationService } = await import('../services/notification.service.js');
      if (apt.patient?.user) {
        await notificationService.notify({
          userIds: apt.patient.user,
          title: 'Appointment Cancelled - Doctor on Leave',
          description: `Your appointment on ${leaveDateStr} at ${apt.startTime} with ${doctor.name} was cancelled due to doctor leave. Please reschedule.`,
          type: 'cancellation',
          link: '/patient/appointments',
        });
      }

      const patientUser = apt.patient?.user ? await User.findById(apt.patient.user) : null;
      const targetEmail = apt.patientEmail || apt.patient?.personalInfo?.email || patientUser?.email || 'patient@jeevandoot.org';

      await emailService.sendDoctorLeaveCancellation({
        patientEmail: targetEmail,
        doctorName: doctor.name,
        date: leaveDateStr,
        reason,
      });
    } catch (e) {
      console.warn('[leaveManagement] notification error:', e.message);
    }
  }

  return success(res, {
    doctor: doctor._id,
    leaveDate: leaveDateStr,
    affectedCount: affected.length,
    message: `Doctor marked on leave. ${affected.length} patient(s) notified.`,
  });
});

export const doctorController = {
  getDashboard,
  getDoctors,
  getDoctorById,
  getMyProfile,
  createDoctor,
  updateDoctor,
  updateMyAvailability,
  toggleDoctorStatus,
  getAvailableSlots,
  markLeave,
  deleteDoctor,
};

export default doctorController;

