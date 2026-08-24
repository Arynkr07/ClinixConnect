import { api, isMockMode } from './api';
import { sleep, generatePatientId } from '../utils/helpers';
import { notificationService } from './notificationService';

const toLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date).slice(0, 10);
  return d.toISOString().slice(0, 10);
};

function getStoredAppointments() {
  try {
    const raw = localStorage.getItem('jd_appointments_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }

  return [
    {
      id: 'apt-1',
      patient: {
        id: generatePatientId('Gopal', new Date()),
        name: 'Gopal Prasad',
        village: 'Amroli',
      },
      doctor: {
        id: 'dr-1',
        name: 'Dr. Rajesh Sharma',
        specialty: 'General Medicine',
      },
      purpose: 'Fever and Persistent Cough',
      date: new Date().toISOString().slice(0, 10),
      startTime: '09:30',
      endTime: '10:00',
      status: 'upcoming',
      urgency: 'Medium',
      mode: 'In-Person',
      chiefComplaint: 'Fever 101°F for 3 days, dry cough, weakness.',
    },
  ];
}

function saveAppointments(items) {
  try {
    localStorage.setItem('jd_appointments_db', JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

// In-memory slot holds to safely prevent double booking
const ACTIVE_SLOT_HOLDS = new Map();

const normalize = (appointment) => {
  const patient = appointment.patient || {};
  const doctor = appointment.doctor || {};
  const pName = patient.name || patient.personalInfo?.fullName || appointment.patientName || 'Patient';
  const pId = patient.id || patient.patientId || appointment.patientId || generatePatientId(pName);
  return {
    id: appointment.id || appointment._id,
    patientId: pId,
    patientName: pName,
    patientVillage: patient.village || patient.personalInfo?.village || appointment.patientVillage || 'Amroli',
    doctorId: doctor.id || doctor.doctorId || appointment.doctorId || 'dr-1',
    doctorName: doctor.name || appointment.doctorName || 'Dr. Rajesh Sharma',
    doctorSpecialty: doctor.specialty || doctor.specialization || appointment.doctorSpecialty || 'General Medicine',
    purpose: appointment.purpose || 'General Consultation',
    date: toLocalDate(appointment.date),
    startTime: appointment.startTime || '09:00',
    endTime: appointment.endTime || '',
    notes: appointment.notes || 'in-person',
    status: appointment.status || 'upcoming',
    symptoms: appointment.symptoms || '',
    urgency: appointment.urgency || 'Low',
    chiefComplaint: appointment.chiefComplaint || '',
    suggestedQuestions: Array.isArray(appointment.suggestedQuestions) ? appointment.suggestedQuestions : [],
    preVisitSummary: appointment.preVisitSummary || null,
    postVisitSummary: appointment.postVisitSummary || '',
    googleCalendarLink: appointment.googleCalendarLink || generateGoogleCalendarLink(appointment),
  };
};

/**
 * Generate a direct Google Calendar Web Event Link
 */
export function generateGoogleCalendarLink(appointment) {
  const title = encodeURIComponent(`Medical Consultation with ${appointment.doctorName || 'Doctor'}`);
  const details = encodeURIComponent(
    `Healthcare Consultation: ${appointment.purpose || 'General'}\nChief Complaint: ${appointment.chiefComplaint || 'N/A'}\nMode: ${appointment.notes || 'In-person'}\nSecured by ClinixConnect`
  );
  const location = encodeURIComponent('ClinixConnect Rural Health Portal / Teleconsultation');
  
  const dateStr = toLocalDate(appointment.date).replace(/-/g, '');
  const startTime = (appointment.startTime || '10:00').replace(':', '');
  const endTime = (appointment.endTime || '10:30').replace(':', '');
  
  const dates = `${dateStr}T${startTime}00/${dateStr}T${endTime}00`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

/**
 * Download a standard .ics iCalendar file for Google/Apple/Outlook calendars
 */
export function downloadIcsFile(appointment) {
  const norm = normalize(appointment);
  const dateStr = norm.date.replace(/-/g, '');
  const start = (norm.startTime || '10:00').replace(':', '') + '00';
  const end = (norm.endTime || '10:30').replace(':', '') + '00';

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClinixConnect//Healthcare Appointment Manager//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:jd-${norm.id}@clinixconnect.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dateStr}T${start}`,
    `DTEND:${dateStr}T${end}`,
    `SUMMARY:Medical Consultation with ${norm.doctorName}`,
    `DESCRIPTION:Appointment: ${norm.purpose}\\nChief Complaint: ${norm.chiefComplaint}\\nMode: ${norm.notes}`,
    'LOCATION:ClinixConnect Healthcare Clinic',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `appointment-${norm.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const appointmentService = {
  /**
   * Temporary Slot Hold Mechanism to safely prevent simultaneous double-booking
   */
  async holdSlot({ doctorId, date, startTime, holdMinutes = 10 }) {
    const key = `${doctorId}-${date}-${startTime}`;
    const now = Date.now();

    const existingHold = ACTIVE_SLOT_HOLDS.get(key);
    if (existingHold && existingHold.expiresAt > now) {
      return { success: false, message: 'This slot is currently being booked by another patient. Please choose another slot.' };
    }

    const expiresAt = now + holdMinutes * 60 * 1000;
    ACTIVE_SLOT_HOLDS.set(key, { expiresAt, heldAt: now });

    return {
      success: true,
      holdKey: key,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInMinutes: holdMinutes,
    };
  },

  async releaseHold(holdKey) {
    if (holdKey) ACTIVE_SLOT_HOLDS.delete(holdKey);
  },

  async getAppointments(params = {}) {
    // Always load local appointments as the ground truth for offline/demo bookings
    let localItems = getStoredAppointments();
    if (params.status) localItems = localItems.filter((a) => a.status === params.status);
    if (params.patient || params.patientId) {
      const pid = String(params.patient || params.patientId);
      localItems = localItems.filter((a) => String(a.patient?.id || a.patientId || a.patient) === pid);
    }
    if (params.doctor || params.doctorId) {
      const did = String(params.doctor || params.doctorId);
      localItems = localItems.filter(
        (a) =>
          String(a.doctor?.id || a.doctorId || a.doctor) === did ||
          String(a.doctor?.name || a.doctorName || '').includes(did)
      );
    }
    if (params.from) {
      const from = String(params.from).slice(0, 10);
      localItems = localItems.filter((a) => toLocalDate(a.date) >= from);
    }
    if (params.to) {
      const to = String(params.to).slice(0, 10);
      localItems = localItems.filter((a) => toLocalDate(a.date) <= to);
    }
    const localNormalized = localItems.map(normalize);

    if (isMockMode()) {
      await sleep(300);
      return localNormalized;
    }

    // In non-mock mode, also fetch from backend and merge (backend first, local fills gaps)
    try {
      const { data } = await api.get('/appointments', params);
      const backendItems = Array.isArray(data) ? data.map(normalize) : [];
      // Deduplicate: prefer backend records; add local-only records that aren't in backend
      const backendIds = new Set(backendItems.map((a) => a.id));
      const localOnly = localNormalized.filter((a) => !backendIds.has(a.id));
      return [...backendItems, ...localOnly];
    } catch {
      // Backend unreachable – fall back to localStorage only
      return localNormalized;
    }
  },

  async getById(id) {
    if (isMockMode()) {
      await sleep(200);
      const items = getStoredAppointments();
      const found = items.find((a) => a.id === id);
      return found ? normalize(found) : null;
    }
    const { data } = await api.get(`/appointments/${id}`);
    return normalize(data);
  },

  async create(payload) {
    const targetDate = toLocalDate(payload.date);
    const slotKey = `${payload.doctorId}-${targetDate}-${payload.startTime}`;

    if (isMockMode()) {
      await sleep(400);
      const items = getStoredAppointments();

      // Check if doctor is on approved leave on targetDate
      try {
        const leaveRequests = JSON.parse(localStorage.getItem('jd_doctor_leave_requests') || '[]');
        const docId = String(payload.doctorId || '').toLowerCase();
        const docName = String(payload.doctorName || '').toLowerCase();
        const isApprovedLeave = leaveRequests.some((r) => {
          const isAppr = String(r.status || '').toLowerCase() === 'approved';
          const isDateMatch = String(r.date).slice(0, 10) === targetDate;
          const rDocId = String(r.doctorId || '').toLowerCase();
          const rDocName = String(r.doctorName || '').toLowerCase();
          return isAppr && isDateMatch && (rDocId === docId || (rDocName && docName && (rDocName.includes(docName) || docName.includes(rDocName))));
        });

        if (isApprovedLeave) {
          throw new Error(`Dr. ${payload.doctorName || 'Doctor'} is on approved leave on ${targetDate}. Please choose another date or doctor.`);
        }
      } catch (e) {
        if (e.message.includes('on approved leave')) throw e;
      }

      // Concurrency check
      const clash = items.find(
        (a) =>
          (a.doctor?.id === payload.doctorId || a.doctorId === payload.doctorId) &&
          toLocalDate(a.date) === targetDate &&
          a.startTime === payload.startTime &&
          a.status === 'upcoming'
      );

      if (clash) {
        throw new Error('This slot has already been booked. Please choose another time.');
      }

      ACTIVE_SLOT_HOLDS.delete(slotKey);

      // Build the Google Calendar web link immediately so it's embedded in the local entry
      const calLink = generateGoogleCalendarLink({
        doctorName: payload.doctorName || 'Doctor',
        purpose: payload.purpose || 'General Consultation',
        chiefComplaint: payload.chiefComplaint || '',
        notes: payload.notes || 'In-person',
        date: targetDate,
        startTime: payload.startTime || '09:00',
        endTime: payload.endTime || '',
      });

      const entry = {
        id: `apt-${Date.now()}`,
        patient: {
          id: payload.patientId || 'JD-1209',
          name: payload.patientName || 'Gopal Prasad',
          village: payload.patientVillage || 'Amroli',
        },
        doctor: {
          id: payload.doctorId || 'dr-1',
          name: payload.doctorName || 'Dr. Rajesh Sharma',
          specialty: payload.doctorSpecialty || 'General Medicine',
        },
        purpose: payload.purpose || 'General Consultation',
        date: targetDate,
        startTime: payload.startTime || '09:00',
        endTime: payload.endTime || '',
        notes: payload.notes || 'in-person',
        status: 'upcoming',
        symptoms: payload.symptoms || '',
        urgency: payload.urgency || 'Low',
        chiefComplaint: payload.chiefComplaint || '',
        suggestedQuestions: payload.suggestedQuestions || [],
        preVisitSummary: payload.preVisitSummary || null,
        postVisitSummary: '',
        googleCalendarLink: calLink,
        googleCalendarEventId: '',
        patientEmail: payload.patientEmail || '',
        doctorEmail: payload.doctorEmail || '',
      };

      const updated = [entry, ...items];
      saveAppointments(updated);

      // Dispatch Notifications to BOTH Patient and Doctor (In-App & SMTP Email)
      try {
        notificationService.sendToUser(payload.patientId, {
          title: 'Appointment Confirmed',
          description: `Appointment booked with ${entry.doctor.name} on ${targetDate} at ${entry.startTime}.`,
          icon: 'event_available',
          tone: 'success',
        });

        notificationService.sendToUser(payload.doctorId, {
          title: 'New Patient Scheduled',
          description: `${entry.patient.name} scheduled on ${targetDate} at ${entry.startTime} (${entry.urgency} Urgency).`,
          icon: 'person_add',
          tone: entry.urgency === 'High' ? 'error' : 'primary',
        });

        // Send email via backend SMTP controller to BOTH Patient & Doctor
        api.post('/appointments', {
          patient: payload.patientId,
          patientName: payload.patientName,
          patientEmail: payload.patientEmail,
          doctor: payload.doctorId,
          doctorName: payload.doctorName,
          doctorEmail: payload.doctorEmail,
          purpose: payload.purpose,
          date: targetDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          notes: payload.notes,
          symptoms: payload.symptoms,
          urgency: payload.urgency,
          chiefComplaint: payload.chiefComplaint,
        }).catch((e) => console.warn('[appointmentService.create] backend email dispatch fallback:', e.message));
      } catch (e) {
        console.warn(e);
      }

      return normalize(entry);
    }

    const { data } = await api.post('/appointments', {
      patient: payload.patientId,
      patientName: payload.patientName,
      patientEmail: payload.patientEmail,
      doctor: payload.doctorId,
      doctorName: payload.doctorName,
      doctorEmail: payload.doctorEmail,
      purpose: payload.purpose,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes,
      symptoms: payload.symptoms,
      urgency: payload.urgency,
      chiefComplaint: payload.chiefComplaint,
      suggestedQuestions: payload.suggestedQuestions,
      preVisitSummary: payload.preVisitSummary,
    });

    // Ensure googleCalendarLink is present (use backend link, else generate web link)
    const norm = normalize(data);
    if (!norm.googleCalendarLink) {
      norm.googleCalendarLink = generateGoogleCalendarLink(norm);
    }

    try {
      const stored = getStoredAppointments();
      saveAppointments([norm, ...stored]);
    } catch {
      /* ignore */
    }

    return norm;
  },

  async update(id, patch) {
    // 1. Always update localStorage items so local state stays strictly in sync
    const items = getStoredAppointments();
    const targetId = String(id).toLowerCase();
    const index = items.findIndex((a) => String(a.id).toLowerCase() === targetId || String(a._id).toLowerCase() === targetId);
    let updatedLocal = null;

    if (index >= 0) {
      items[index] = {
        ...items[index],
        ...patch,
        date: patch.date ? toLocalDate(patch.date) : items[index].date,
        startTime: patch.startTime ?? items[index].startTime,
      };
      saveAppointments(items);
      updatedLocal = normalize(items[index]);
    }

    if (isMockMode()) {
      await sleep(200);
      return updatedLocal;
    }

    // 2. Also send update to backend API if available
    try {
      const { data } = await api.put(`/appointments/${id}`, patch);
      return normalize(data);
    } catch (e) {
      console.warn('[appointmentService] update backend fallback:', e.message);
      return updatedLocal;
    }
  },

  async cancel(id, reason = '') {
    if (isMockMode()) {
      await sleep(300);
      const items = getStoredAppointments();
      const index = items.findIndex((a) => a.id === id);
      if (index >= 0) {
        items[index].status = 'cancelled';
        items[index].cancelledAt = new Date().toISOString();
        items[index].cancelledReason = reason;
        saveAppointments(items);

        const apt = items[index];
        // Send cancellation alerts via BOTH In-App Notification and SMTP Email to Patient and Doctor
        try {
          const patientId = apt.patient?.id || apt.patientId;
          const doctorId = apt.doctor?.id || apt.doctorId;

          if (patientId) {
            notificationService.sendToUser(patientId, {
              title: 'Appointment Cancelled',
              description: `Your appointment with ${apt.doctor?.name || 'Doctor'} on ${apt.date} at ${apt.startTime} was cancelled.`,
              icon: 'event_busy',
              tone: 'error',
            });
          }
          if (doctorId) {
            notificationService.sendToUser(doctorId, {
              title: 'Appointment Cancelled',
              description: `Appointment with ${apt.patient?.name || 'Patient'} on ${apt.date} at ${apt.startTime} was cancelled.`,
              icon: 'event_busy',
              tone: 'error',
            });
          }

          // Trigger backend SMTP Email dispatch
          api.post(`/appointments/${id}/cancel`, { reason }).catch(() => {});
        } catch (e) {
          console.warn('[appointmentService.cancel] notification error:', e);
        }

        return normalize(items[index]);
      }
      return null;
    }
    const { data } = await api.post(`/appointments/${id}/cancel`, { reason });

    // Also dispatch in-app notifications
    try {
      const norm = normalize(data);
      const patientId = norm.patient?.id || norm.patientId;
      const doctorId = norm.doctor?.id || norm.doctorId;
      if (patientId) {
        notificationService.sendToUser(patientId, {
          title: 'Appointment Cancelled',
          description: `Your appointment on ${norm.date} at ${norm.startTime} has been cancelled.`,
          icon: 'event_busy',
          tone: 'error',
        });
      }
      if (doctorId) {
        notificationService.sendToUser(doctorId, {
          title: 'Appointment Cancelled',
          description: `Appointment with ${norm.patient?.name || 'Patient'} on ${norm.date} was cancelled.`,
          icon: 'event_busy',
          tone: 'error',
        });
      }
    } catch {
      /* ignore */
    }

    return normalize(data);
  },

  async reschedule(id, newDate, newStartTime, newEndTime = '') {
    const targetDate = toLocalDate(newDate);
    const patch = { date: targetDate, startTime: newStartTime, endTime: newEndTime, status: 'upcoming' };

    // Regenerate the Google Calendar link for the new date/time before saving
    const items = getStoredAppointments();
    const existing = items.find((a) => String(a.id).toLowerCase() === String(id).toLowerCase() || String(a._id).toLowerCase() === String(id).toLowerCase());
    const newCalLink = generateGoogleCalendarLink({
      doctorName: existing?.doctor?.name || existing?.doctorName || 'Doctor',
      purpose: existing?.purpose || 'General Consultation',
      chiefComplaint: existing?.chiefComplaint || '',
      notes: existing?.notes || 'In-person',
      date: targetDate,
      startTime: newStartTime,
      endTime: newEndTime,
    });
    patch.googleCalendarLink = newCalLink;

    const updated = await this.update(id, patch);

    if (updated) {
      const patientId = updated.patientId || updated.patient?.id;
      const doctorId = updated.doctorId || updated.doctor?.id;

      // In-App Notifications
      try {
        if (patientId) {
          notificationService.sendToUser(patientId, {
            title: 'Appointment Rescheduled',
            description: `Your appointment with ${updated.doctorName || 'Doctor'} is rescheduled to ${targetDate} at ${newStartTime}.`,
            icon: 'edit_calendar',
            tone: 'primary',
          });
        }
        if (doctorId) {
          notificationService.sendToUser(doctorId, {
            title: 'Appointment Rescheduled',
            description: `Appointment with ${updated.patientName || 'Patient'} rescheduled to ${targetDate} at ${newStartTime}.`,
            icon: 'edit_calendar',
            tone: 'primary',
          });
        }
      } catch (e) {
        console.warn(e);
      }

      // Backend API call for SMTP email dispatch + Google Calendar event update
      try {
        api.put(`/appointments/${id}`, patch).catch(() => {});
      } catch (e) {
        console.warn(e);
      }
    }

    return updated;
  },
};

export default appointmentService;
