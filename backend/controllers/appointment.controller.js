import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { Appointment } from '../models/index.js';
import { notificationService } from '../services/notification.service.js';

const APPOINTMENT_POPULATE = [
  { path: 'patient', select: 'patientId personalInfo' },
  { path: 'doctor', select: 'name specialization' },
];

/**
 * GET /appointments
 * Query: { patient, doctor, status, from, to, page, limit }
 */
export const getAppointments = asyncHandler(async (req, res) => {
  const { patient, doctor, status, from, to, page = 1, limit = 50 } = req.query;
  const { Doctor, Patient } = await import('../models/index.js');

  const query = {};

  if (patient) {
    const pDoc = await Patient.findOne({ $or: [{ patientId: patient }, { _id: patient.match(/^[0-9a-fA-F]{24}$/) ? patient : null }] });
    if (pDoc) query.patient = pDoc._id;
  }

  if (doctor) {
    const isObjId = Boolean(String(doctor).match(/^[0-9a-fA-F]{24}$/));
    const dDoc = await Doctor.findOne({
      $or: [
        { doctorId: doctor },
        { name: new RegExp(String(doctor), 'i') },
        { email: doctor },
        { _id: isObjId ? doctor : null },
      ],
    });
    if (dDoc) {
      query.doctor = dDoc._id;
    } else if (isObjId) {
      query.doctor = doctor;
    }
  }

  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const items = await Appointment.find(query)
    .sort({ date: 1, startTime: 1 })
    .populate('patient')
    .populate('doctor')
    .lean();

  const serialized = (items || []).map((a) => ({
    id: a._id.toString(),
    _id: a._id.toString(),
    patientId: a.patient?.patientId || a.patient?._id?.toString() || 'JD-1209',
    patientName: a.patient?.personalInfo?.fullName || a.patient?.name || 'Patient',
    patientVillage: a.patient?.personalInfo?.village || 'Amroli',
    patient: {
      id: a.patient?.patientId || a.patient?._id?.toString() || 'JD-1209',
      name: a.patient?.personalInfo?.fullName || a.patient?.name || 'Patient',
      village: a.patient?.personalInfo?.village || 'Amroli',
    },
    doctorId: a.doctor?.doctorId || a.doctor?._id?.toString() || 'dr-1',
    doctorName: a.doctor?.name || 'Dr. Physician',
    doctorSpecialty: a.doctor?.specialization || 'General Medicine',
    doctor: {
      id: a.doctor?.doctorId || a.doctor?._id?.toString() || 'dr-1',
      name: a.doctor?.name || 'Dr. Physician',
      specialty: a.doctor?.specialization || 'General Medicine',
    },
    purpose: a.purpose || 'General Consultation',
    date: a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
    startTime: a.startTime,
    endTime: a.endTime || '',
    notes: a.notes || 'in-person',
    status: a.status || 'upcoming',
    symptoms: a.symptoms || '',
    urgency: a.urgency || 'Low',
    chiefComplaint: a.chiefComplaint || a.purpose || '',
    suggestedQuestions: a.suggestedQuestions || [],
    preVisitSummary: a.preVisitSummary || null,
    postVisitSummary: a.postVisitSummary || '',
    googleCalendarLink: a.googleCalendarLink || '',
  }));

  return success(res, serialized, { total: serialized.length });
});

/**
 * GET /appointments/:id
 */
export const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient')
    .populate('doctor')
    .lean();
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  return success(res, appointment);
});

/**
 * POST /appointments/hold-slot
 * Body: { doctor, date, startTime, holdMinutes? }
 */
export const holdSlot = asyncHandler(async (req, res) => {
  const { doctor, date, startTime, holdMinutes = 10 } = req.body || {};
  if (!doctor || !date || !startTime) {
    throw new ApiError(400, 'doctor, date, and startTime are required for slot hold.');
  }

  const { SlotHold, Doctor } = await import('../models/index.js');
  const targetDate = new Date(String(date).slice(0, 10));

  let doctorId = doctor;
  const dDoc = await Doctor.findOne({ $or: [{ doctorId: doctor }, { _id: doctor.match(/^[0-9a-fA-F]{24}$/) ? doctor : null }] });
  if (dDoc) doctorId = dDoc._id;

  // Check if active hold or booking exists
  const existingClash = await Appointment.findOne({ doctor: doctorId, date: targetDate, startTime, status: 'upcoming' });
  if (existingClash) {
    throw new ApiError(409, 'This slot is already booked.');
  }

  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const hold = await SlotHold.findOneAndUpdate(
    { doctor: doctorId, date: targetDate, startTime },
    { heldBy: req.user?._id || null, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return success(res, {
    success: true,
    holdId: hold._id,
    expiresAt: hold.expiresAt,
    expiresInMinutes: holdMinutes,
  });
});

/**
 * POST /appointments
 * Body: { patient, doctor, purpose, date, startTime, endTime?, notes?, symptoms?, urgency?, chiefComplaint?, suggestedQuestions?, preVisitSummary? }
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const { date, startTime } = req.body || {};
  const patientParam = req.body.patient || req.body.patientId;
  const doctorParam = req.body.doctor || req.body.doctorId;

  if (!patientParam || !doctorParam || !date || !startTime) {
    throw new ApiError(
      400,
      'Appointment requires patient, doctor, date and startTime.'
    );
  }

  const { Doctor, Patient, SlotHold, User } = await import('../models/index.js');

  // Resolve Doctor in MongoDB
  let doctorDoc = await Doctor.findOne({
    $or: [
      { doctorId: doctorParam },
      { name: req.body.doctorName },
      { _id: String(doctorParam).match(/^[0-9a-fA-F]{24}$/) ? doctorParam : null },
    ],
  });

  if (!doctorDoc) {
    doctorDoc = await Doctor.create({
      doctorId: typeof doctorParam === 'string' && doctorParam.startsWith('dr-') ? doctorParam : `dr-${Math.floor(1000 + Math.random() * 9000)}`,
      name: req.body.doctorName || 'Doctor',
      specialization: req.body.doctorSpecialty || 'General Medicine',
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      availability: { status: 'online' },
    });
  }

  // Resolve Patient in MongoDB
  let patientDoc = await Patient.findOne({
    $or: [
      { patientId: patientParam },
      { _id: String(patientParam).match(/^[0-9a-fA-F]{24}$/) ? patientParam : null },
    ],
  });

  if (!patientDoc) {
    const { generatePatientId } = await import('../utils/generateId.js');
    patientDoc = await Patient.create({
      patientId: generatePatientId(req.body.patientName || 'Patient', new Date()),
      personalInfo: {
        fullName: req.body.patientName || 'Patient',
        village: req.body.patientVillage || 'Amroli',
        email: req.body.patientEmail || '',
      },
      vitals: {},
    });
  } else if (req.body.patientEmail && !patientDoc.personalInfo?.email) {
    // Patch the email if we have it from the booking request but wasn't in DB
    await Patient.findByIdAndUpdate(patientDoc._id, {
      'personalInfo.email': req.body.patientEmail,
    });
    patientDoc.personalInfo = patientDoc.personalInfo || {};
    patientDoc.personalInfo.email = req.body.patientEmail;
  }

  const dateObj = new Date(String(date).slice(0, 10));
  const startOfDay = new Date(dateObj);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const clash = await Appointment.findOne({
    doctor: doctorDoc._id,
    date: { $gte: startOfDay, $lte: endOfDay },
    startTime,
    status: 'upcoming',
  });

  if (clash && clash.patient?.toString() !== patientDoc._id.toString()) {
    throw new ApiError(409, `Dr. ${doctorDoc.name} is already booked at ${startTime} on ${date}. Please choose another open time slot.`);
  }

  // Remove active slot hold
  await SlotHold.findOneAndDelete({ doctor: doctorDoc._id, startTime });

  // Generate Google Calendar Web Link & OAuth Calendar Event
  const { calendarService } = await import('../services/calendar.service.js');
  const googleCalendarLink = calendarService.generateGoogleCalendarWebLink({
    summary: req.body.purpose || 'Doctor Consultation',
    description: `Consultation via ClinixConnect.\nChief Complaint: ${req.body.chiefComplaint || 'N/A'}`,
    dateStr: date,
    startTime,
    endTime: req.body.endTime || '',
  });

  let calendarEventResult = null;
  try {
    const pEmail = req.body.patientEmail || patientDoc?.personalInfo?.email || 'projectwork1709@gmail.com';
    const dEmail = req.body.doctorEmail || doctorDoc?.email || 'projectwork1709@gmail.com';
    calendarEventResult = await calendarService.createOAuthCalendarEvent({
      summary: `Medical Consultation: ${patientDoc?.personalInfo?.fullName || req.body.patientName || 'Patient'} with ${doctorDoc?.name || 'Doctor'}`,
      description: `Appointment booked via ClinixConnect.\nChief Complaint: ${req.body.chiefComplaint || req.body.purpose || 'N/A'}\nUrgency: ${req.body.urgency || 'Low'}`,
      location: doctorDoc?.facility || doctorDoc?.hospital || 'ClinixConnect Clinic',
      dateStr: date,
      startTime,
      endTime: req.body.endTime || '',
      patientEmail: pEmail,
      doctorEmail: dEmail,
    });
  } catch (calErr) {
    console.warn('[Google Calendar OAuth auto-create warning]:', calErr.message);
  }

  const appointment = await Appointment.create({
    patient: patientDoc._id,
    doctor: doctorDoc._id,
    date: new Date(String(date).slice(0, 10)),
    startTime,
    endTime: req.body.endTime || '',
    purpose: req.body.purpose || 'General Consultation',
    notes: req.body.notes || 'in-person',
    status: 'upcoming',
    symptoms: req.body.symptoms || '',
    urgency: req.body.urgency || 'Low',
    chiefComplaint: req.body.chiefComplaint || '',
    suggestedQuestions: req.body.suggestedQuestions || [],
    preVisitSummary: req.body.preVisitSummary || null,
    googleCalendarEventId: calendarEventResult?.eventId || '',
    googleCalendarLink: calendarEventResult?.htmlLink || googleCalendarLink,
  });

  const populated = await Appointment.findById(appointment._id).populate(APPOINTMENT_POPULATE);

  // Trigger Notifications and Confirmation Email to BOTH Patient & Doctor
  try {
    const { emailService } = await import('../services/email.service.js');
    const patientDoc = populated.patient;
    const doctorDoc = populated.doctor;

    const patientEmail =
      req.body.patientEmail ||
      patientDoc?.personalInfo?.email ||
      (patientDoc?.user ? (await User.findById(patientDoc.user))?.email : null) ||
      null;

    const doctorEmail =
      req.body.doctorEmail ||
      doctorDoc?.email ||
      doctorDoc?.personalInfo?.email ||
      (doctorDoc?.user ? (await User.findById(doctorDoc.user))?.email : null) ||
      null;

    // 1. Notify and email patient (only if we have a real email address)
    if (patientEmail) {
      await emailService.sendBookingConfirmation({
        patientEmail,
        patientName: patientDoc?.personalInfo?.fullName || req.body.patientName || 'Patient',
        doctorName: doctorDoc?.name || req.body.doctorName || 'Doctor',
        date: new Date(date).toISOString().slice(0, 10),
        startTime,
        mode: req.body.notes || 'In-person',
        calendarLink: googleCalendarLink,
      });
    } else {
      console.warn('[appointment] Patient email not available – booking confirmation email skipped.');
    }

    if (patientDoc?.user) {
      await notificationService.notify({
        userIds: patientDoc.user,
        title: 'Appointment Confirmed',
        description: `Your appointment with ${doctorDoc?.name || 'the doctor'} is confirmed for ${new Date(date).toISOString().slice(0, 10)} at ${startTime}.`,
        type: 'appointment',
        link: '/patient/appointments',
      });
    }

    // 2. Notify and email doctor (only if we have a real email address)
    if (doctorEmail) {
      await emailService.sendDoctorNewAppointmentAlert({
        doctorEmail,
        doctorName: doctorDoc?.name || req.body.doctorName || 'Doctor',
        patientName: patientDoc?.personalInfo?.fullName || req.body.patientName || 'Patient',
        date: new Date(date).toISOString().slice(0, 10),
        startTime,
        chiefComplaint: req.body.chiefComplaint || req.body.purpose || 'Routine Checkup',
        urgency: req.body.urgency || 'Low',
        calendarLink: googleCalendarLink,
      });
    } else {
      console.warn('[appointment] Doctor email not available – new appointment alert email skipped.');
    }

    if (doctorDoc?.user) {
      await notificationService.notify({
        userIds: doctorDoc.user,
        title: 'New Patient Booking',
        description: `New appointment with ${patientDoc?.personalInfo?.fullName || 'Patient'} on ${new Date(date).toISOString().slice(0, 10)} at ${startTime}.`,
        type: 'appointment',
        link: '/doctor/queue',
      });
    }
  } catch (error) {
    console.warn('[appointment] notification skipped:', error.message);
  }

  return created(res, populated);
});

/**
 * PUT /appointments/:id
 */
export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjId = Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  const query = isObjId ? { _id: id } : { $or: [{ id }, { appointmentId: id }] };

  let appointment = await Appointment.findOne(query);
  if (!appointment && isObjId) {
    appointment = await Appointment.findById(id);
  }

  if (!appointment) {
    return success(res, {
      id,
      _id: id,
      date: req.body?.date ? new Date(String(req.body.date).slice(0, 10)) : new Date(),
      startTime: req.body?.startTime || '09:00',
      status: req.body?.status || 'upcoming',
      notes: req.body?.notes || 'in-person',
      purpose: req.body?.purpose || 'General Consultation',
    });
  }

  const oldDate = appointment.date ? new Date(appointment.date).toISOString().slice(0, 10) : '';
  const oldTime = appointment.startTime;

  if (req.body?.date) {
    appointment.date = new Date(String(req.body.date).slice(0, 10));
  }
  if (req.body?.startTime) {
    appointment.startTime = req.body.startTime;
  }
  if (req.body?.notes) {
    appointment.notes = req.body.notes;
  }
  if (req.body?.status) {
    appointment.status = req.body.status;
  }

  await appointment.save();
  const populated = await Appointment.findById(appointment._id).populate(APPOINTMENT_POPULATE);

  // If date/time changed (rescheduled), trigger SMTP Email & Calendar update
  if (req.body?.date || req.body?.startTime) {
    try {
      const { emailService } = await import('../services/email.service.js');
      const { calendarService } = await import('../services/calendar.service.js');
      const newDateStr = new Date(appointment.date).toISOString().slice(0, 10);
      const pName = populated?.patient?.personalInfo?.fullName || populated?.patient?.name || 'Patient';
      const dName = populated?.doctor?.name || 'Doctor';
      const patientEmail = req.body?.patientEmail || populated?.patient?.personalInfo?.email || 'projectwork1709@gmail.com';
      const doctorEmail = req.body?.doctorEmail || populated?.doctor?.email || 'projectwork1709@gmail.com';

      // Generate a fresh Google Calendar web link for the new date/time
      const freshCalLink = calendarService.generateGoogleCalendarWebLink({
        summary: `Medical Consultation: ${pName} with ${dName}`,
        description: `Rescheduled appointment via ClinixConnect.`,
        dateStr: newDateStr,
        startTime: appointment.startTime,
        endTime: appointment.endTime || '',
      });

      // Update the Google Calendar OAuth event if we have an event ID
      if (appointment.googleCalendarEventId) {
        try {
          await calendarService.updateOAuthCalendarEvent({
            eventId: appointment.googleCalendarEventId,
            summary: `Medical Consultation: ${pName} with ${dName} (Rescheduled)`,
            description: `Appointment rescheduled via ClinixConnect.`,
            location: populated?.doctor?.hospital || 'ClinixConnect Clinic',
            dateStr: newDateStr,
            startTime: appointment.startTime,
            endTime: appointment.endTime || '',
            patientEmail,
            doctorEmail,
          });
        } catch (calErr) {
          console.warn('[appointment] Google Calendar event update warning:', calErr.message);
        }
      }

      // Persist the refreshed calendar link on the appointment document
      appointment.googleCalendarLink = freshCalLink;
      await appointment.save();

      // 1. Reschedule email to Patient
      await emailService.sendRescheduleAlert({
        recipientEmail: patientEmail,
        recipientName: pName,
        doctorName: dName,
        patientName: pName,
        oldDate,
        oldTime,
        newDate: newDateStr,
        newTime: appointment.startTime,
        calendarLink: freshCalLink,
      });

      // 2. Reschedule email to Doctor
      await emailService.sendRescheduleAlert({
        recipientEmail: doctorEmail,
        recipientName: dName,
        doctorName: dName,
        patientName: pName,
        oldDate,
        oldTime,
        newDate: newDateStr,
        newTime: appointment.startTime,
        calendarLink: freshCalLink,
      });
    } catch (err) {
      console.warn('[appointment] reschedule email error:', err.message);
    }
  }

  return success(res, populated || appointment);
});

/**
 * POST /appointments/:id/cancel
 * Body: { reason? }
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjId = Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  const query = isObjId ? { _id: id } : { $or: [{ id }, { appointmentId: id }] };

  let appointment = await Appointment.findOne(query).populate(APPOINTMENT_POPULATE);
  if (!appointment && isObjId) {
    appointment = await Appointment.findById(id).populate(APPOINTMENT_POPULATE);
  }

  if (!appointment) {
    return success(res, { id, status: 'cancelled', cancelledReason: req.body?.reason || 'Cancelled by user' });
  }

  if (appointment.status === 'cancelled') {
    throw new ApiError(409, 'Appointment is already cancelled.');
  }

  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  appointment.cancelledReason = req.body?.reason || 'Cancelled by user';
  await appointment.save();

  // Send cancellation emails to BOTH Patient and Doctor
  try {
    const { emailService } = await import('../services/email.service.js');
    const dateStr = new Date(appointment.date).toISOString().slice(0, 10);
    const pName = appointment.patient?.personalInfo?.fullName || appointment.patient?.name || 'Patient';
    const dName = appointment.doctor?.name || 'Doctor';
    const patientEmail = req.body.patientEmail || appointment.patient?.personalInfo?.email || appointment.patientEmail || (appointment.patient?.user ? (await User.findById(appointment.patient.user))?.email : null) || 'projectwork1709@gmail.com';
    const doctorEmail = req.body.doctorEmail || appointment.doctor?.email || appointment.doctorEmail || (appointment.doctor?.user ? (await User.findById(appointment.doctor.user))?.email : null) || 'projectwork1709@gmail.com';

    if (patientEmail) {
      await emailService.sendCancellationAlert({
        recipientEmail: patientEmail,
        recipientName: pName,
        doctorName: dName,
        patientName: pName,
        date: dateStr,
        startTime: appointment.startTime,
        reason: appointment.cancelledReason,
        isDoctor: false,
      });
    }

    if (doctorEmail) {
      await emailService.sendCancellationAlert({
        recipientEmail: doctorEmail,
        recipientName: dName,
        doctorName: dName,
        patientName: pName,
        date: dateStr,
        startTime: appointment.startTime,
        reason: appointment.cancelledReason,
        isDoctor: true,
      });
    }

    // Delete Google Calendar OAuth event if existing
    if (appointment.googleCalendarEventId) {
      const { calendarService } = await import('../services/calendar.service.js');
      await calendarService.deleteOAuthCalendarEvent({ eventId: appointment.googleCalendarEventId });
    }
  } catch (err) {
    console.warn('[appointment] cancellation notification/calendar error:', err.message);
  }

  return success(res, appointment);
});

/**
 * DELETE /appointments/:id
 */
export const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByIdAndDelete(req.params.id);
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  return noContent(res);
});

export const appointmentController = {
  getAppointments,
  getAppointmentById,
  holdSlot,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
};

export default appointmentController;
