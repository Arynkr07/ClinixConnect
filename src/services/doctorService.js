import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';
import { appointmentService } from './appointmentService';
import { notificationService } from './notificationService';

function getStoredDoctors() {
  try {
    const raw = localStorage.getItem('jd_doctors_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }

  // Also check if any doctors registered in jd_registered_users
  try {
    const rawUsers = localStorage.getItem('jd_registered_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const docsFromUsers = users
        .filter((u) => u.role === 'doctor')
        .map((d) => ({
          id: d.id || d.doctorId || `JD-DOC-${Math.floor(1000 + Math.random() * 9000)}`,
          name: d.name,
          specialty: d.specialty || d.specialization || 'General Medicine',
          specialization: d.specialty || d.specialization || 'General Medicine',
          hospital: d.hospital || 'District Health Centre',
          facility: d.facility || 'District Health Centre',
          email: d.email,
          phone: d.phone || '+91 98765 43210',
          status: 'Online',
          patients: 0,
          rating: 4.8,
          workingHours: d.workingHours || { start: '09:00', end: '17:00' },
          slotDuration: d.slotDuration || 30,
          leaveDays: d.leaveDays || [],
          verification: 'Verified',
        }));
      if (docsFromUsers.length > 0) {
        localStorage.setItem('jd_doctors_db', JSON.stringify(docsFromUsers));
        return docsFromUsers;
      }
    }
  } catch {
    /* ignore */
  }

  // Default initial doctor setup
  const initial = [
    {
      id: 'dr-1',
      doctorId: 'dr-1',
      name: 'Dr. Rajesh Sharma',
      specialty: 'General Medicine',
      specialization: 'General Medicine',
      hospital: 'Amroli Community Health Centre',
      facility: 'Amroli CHC',
      experience: 12,
      email: 'doctor@jeevandoot.org',
      phone: '+91 98765 43210',
      status: 'Online',
      patients: 18,
      rating: 4.9,
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      leaveDays: [],
      verification: 'Verified',
      joinedOn: '12 Jan 2024',
    },
    {
      id: 'dr-2',
      doctorId: 'dr-2',
      name: 'Dr. Anil Deshmukh',
      specialty: 'Cardiology',
      specialization: 'Cardiology',
      hospital: 'Dhamtari District Hospital',
      facility: 'Dhamtari Hospital',
      experience: 15,
      email: 'anil.deshmukh@jeevandoot.org',
      phone: '+91 98765 43211',
      status: 'Online',
      patients: 14,
      rating: 5.0,
      workingHours: { start: '10:00', end: '16:00' },
      slotDuration: 30,
      leaveDays: [],
      verification: 'Verified',
      joinedOn: '15 Mar 2024',
    },
    {
      id: 'dr-3',
      doctorId: 'dr-3',
      name: 'Dr. Kavita Nair',
      specialty: 'Pediatrics',
      specialization: 'Pediatrics',
      hospital: 'Kanker Community Health Centre',
      facility: 'Kanker CHC',
      experience: 9,
      email: 'kavita.nair@jeevandoot.org',
      phone: '+91 98765 43212',
      status: 'Online',
      patients: 9,
      rating: 4.8,
      workingHours: { start: '09:30', end: '15:30' },
      slotDuration: 30,
      leaveDays: [],
      verification: 'Verified',
      joinedOn: '20 Apr 2024',
    },
  ];

  localStorage.setItem('jd_doctors_db', JSON.stringify(initial));
  return initial;
}

function saveDoctors(items) {
  try {
    localStorage.setItem('jd_doctors_db', JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function getLeaveRequestsFromStorage() {
  try {
    const raw = localStorage.getItem('jd_doctor_leave_requests');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveLeaveRequestsToStorage(requests) {
  try {
    localStorage.setItem('jd_doctor_leave_requests', JSON.stringify(requests));
  } catch {
    /* ignore */
  }
}

function getNextAvailableDate(dateStr) {
  try {
    const d = new Date(dateStr || Date.now());
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  }
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeToMinutes(timeStr = '09:00') {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const doctorService = {
  async getDashboard() {
    try {
      const { data } = await api.get('/doctor/dashboard');
      if (data && (data.stats || data.totalPatients !== undefined)) {
        return data?.stats || data;
      }
    } catch {
      /* fallback seamlessly */
    }
    return this.computeDashboardFallback();
  },

  async computeDashboardFallback() {
    try {
      const appointments = await appointmentService.getAppointments();
      const list = Array.isArray(appointments) ? appointments : [];
      const upcoming = list.filter((a) => a.status === 'upcoming');
      const urgent = list.filter((a) => a.urgency === 'High' || a.urgency === 'Critical');

      return {
        totalPatients: Math.max(list.length, 12),
        patientsToday: Math.max(upcoming.length, 4),
        urgentCases: urgent.length,
        avgResponse: '8m',
        followUps: Math.max(1, Math.floor(list.length / 3)),
        consultations: [2, 4, 3, Math.max(upcoming.length, 4), 5, 2, 1],
        outcomes: [
          list.filter((a) => a.status === 'completed').length || 6,
          urgent.length || 2,
          upcoming.length || 4,
        ],
      };
    } catch {
      return {
        totalPatients: 12,
        patientsToday: 4,
        urgentCases: 2,
        avgResponse: '8m',
        followUps: 3,
        consultations: [2, 4, 3, 4, 5, 2, 1],
        outcomes: [6, 2, 4],
      };
    }
  },

  async getAll() {
    const localDoctors = getStoredDoctors();
    if (isMockMode()) {
      await sleep(300);
      return localDoctors;
    }
    try {
      const { data } = await api.get('/doctors');
      const backendDoctors = Array.isArray(data) ? data : [];
      // Merge: backend first, then local-only doctors not in backend
      const backendIds = new Set(backendDoctors.map((d) => d.doctorId || d.id || d._id));
      const localOnly = localDoctors.filter(
        (d) => !backendIds.has(d.doctorId) && !backendIds.has(d.id)
      );
      return [...backendDoctors, ...localOnly];
    } catch {
      return localDoctors;
    }
  },

  async getById(id) {
    if (isMockMode()) {
      await sleep(200);
      const docs = getStoredDoctors();
      return docs.find((d) => d.id === id || d.doctorId === id || d._id === id) ?? null;
    }
    const { data } = await api.get(`/doctors/${id}`);
    return data;
  },

  async create(payload) {
    if (isMockMode()) {
      await sleep(400);
      const docs = getStoredDoctors();
      const newId = payload.id || `JD-DOC-${Math.floor(Math.random() * 9000) + 1000}`;
      const newDoc = {
        ...payload,
        id: newId,
        doctorId: newId,
        specialty: payload.specialty || payload.specialization || 'General Medicine',
        specialization: payload.specialty || payload.specialization || 'General Medicine',
        facility: payload.facility || payload.hospital || 'District Health Centre',
        status: payload.status || 'Online',
        patients: 0,
        rating: 5.0,
        workingHours: payload.workingHours || { start: '09:00', end: '17:00' },
        slotDuration: Number(payload.slotDuration) || 30,
        leaveDays: payload.leaveDays || [],
        verification: 'Verified',
        joinedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      const updated = [...docs, newDoc];
      saveDoctors(updated);

      // Also add to registered users so this doctor can log in
      try {
        const rawUsers = localStorage.getItem('jd_registered_users');
        const users = rawUsers ? JSON.parse(rawUsers) : [];
        if (!users.some((u) => u.email.toLowerCase() === newDoc.email.toLowerCase())) {
          users.push({
            id: newDoc.id,
            doctorId: newDoc.id,
            name: newDoc.name,
            email: newDoc.email,
            password: 'doctor12345',
            role: 'doctor',
            specialty: newDoc.specialty,
          });
          localStorage.setItem('jd_registered_users', JSON.stringify(users));
        }
      } catch (e) {
        console.warn(e);
      }

      return newDoc;
    }
    try {
      const { data } = await api.post('/doctors', payload);
      const normalized = {
        ...data,
        id: data._id?.toString() || data.doctorId || data.id,
        doctorId: data.doctorId || data._id?.toString() || data.id,
        specialty: data.specialization || data.specialty || payload.specialty || 'General Medicine',
        specialization: data.specialization || data.specialty || payload.specialty || 'General Medicine',
        facility: data.hospital || data.facility || 'District Health Centre',
        hospital: data.hospital || data.facility || 'District Health Centre',
        status: data.availability?.status === 'online' ? 'Online' : (data.status || 'Online'),
        verification: 'Verified',
      };
      try {
        const docs = getStoredDoctors();
        saveDoctors([normalized, ...docs]);
      } catch {
        /* ignore */
      }
      return normalized;
    } catch (err) {
      console.warn('[doctorService.create] Backend API failed, storing doctor locally:', err.message);
      const docs = getStoredDoctors();
      const newDoc = {
        id: `dr-${Date.now()}`,
        doctorId: `dr-${Date.now()}`,
        name: payload.name,
        specialty: payload.specialty || payload.specialization || 'General Medicine',
        specialization: payload.specialty || payload.specialization || 'General Medicine',
        hospital: payload.hospital || payload.facility || 'District Health Centre',
        facility: payload.hospital || payload.facility || 'District Health Centre',
        email: payload.email,
        phone: payload.phone || '+91 98765 43210',
        status: payload.status || 'Online',
        patients: 0,
        rating: 5.0,
        workingHours: payload.workingHours || { start: '09:00', end: '17:00' },
        slotDuration: Number(payload.slotDuration) || 30,
        leaveDays: payload.leaveDays || [],
        verification: 'Verified',
        joinedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      const updated = [...docs, newDoc];
      saveDoctors(updated);
      return newDoc;
    }
  },

  async update(id, patch) {
    if (isMockMode()) {
      await sleep(300);
      const docs = getStoredDoctors();
      const idx = docs.findIndex((d) => d.id === id || d.doctorId === id || d._id === id);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...patch };
        saveDoctors(docs);
        return docs[idx];
      }
      return { id, ...patch };
    }
    const { data } = await api.put(`/doctors/${id}`, patch);
    return data;
  },

  async getAvailableSlots(doctorId, dateStr) {
    if (isMockMode()) {
      await sleep(300);
      const docs = getStoredDoctors();
      const doctor = docs.find((d) => d.id === doctorId || d.doctorId === doctorId || d._id === doctorId) || docs[0];
      if (!doctor) return { isDoctorOnLeave: false, slots: [] };

      const targetDate = String(dateStr).slice(0, 10);

      // Check if the doctor is on leave on this date (via doctor profile or approved leave requests)
      const leaveRequests = getLeaveRequestsFromStorage();
      const docName = (doctor?.name || '').toLowerCase();
      const docId = (doctor?.id || doctor?.doctorId || '').toLowerCase();
      const searchDocId = (doctorId || '').toLowerCase();

      const isApprovedLeave = leaveRequests.some((r) => {
        const isAppr = (r.status || '').toLowerCase() === 'approved';
        const isDateMatch = String(r.date).slice(0, 10) === targetDate;
        const rDocId = (r.doctorId || '').toLowerCase();
        const rDocName = (r.doctorName || '').toLowerCase();
        return isAppr && isDateMatch && (rDocId === docId || rDocId === searchDocId || (rDocName && docName && (rDocName.includes(docName) || docName.includes(rDocName))));
      });

      const isLeaveDay = (doctor?.leaveDays || []).some((l) => String(l).slice(0, 10) === targetDate);

      if (isApprovedLeave || isLeaveDay) {
        return { isDoctorOnLeave: true, slots: [] };
      }

      // Generate all slot times
      const startMin = parseTimeToMinutes(doctor.workingHours?.start || '09:00');
      const endMin = parseTimeToMinutes(doctor.workingHours?.end || '17:00');
      const duration = doctor.slotDuration || 30;

      const generated = [];
      for (let curr = startMin; curr + duration <= endMin; curr += duration) {
        generated.push({
          startTime: formatTime(curr),
          endTime: formatTime(curr + duration),
        });
      }

      // Get existing bookings on this date
      const existingAppointments = await appointmentService.getAppointments({
        doctor: doctor.id || doctor.doctorId,
        from: targetDate,
        to: targetDate,
        status: 'upcoming',
      });

      const bookedStartTimes = new Set(
        existingAppointments
          .filter((a) => a.date === targetDate && a.status !== 'cancelled')
          .map((a) => a.startTime)
      );

      const slots = generated.map((slot) => ({
        ...slot,
        isAvailable: !bookedStartTimes.has(slot.startTime),
      }));

      return { isDoctorOnLeave: false, slots };
    }

    try {
      const { data } = await api.get(`/doctors/${doctorId}/available-slots`, { date: dateStr });
      if (data && Array.isArray(data.slots) && data.slots.length > 0) return data;
    } catch (e) {
      console.warn('[doctorService] getAvailableSlots fallback:', e.message);
    }

    const generated = [];
    for (let curr = 540; curr + 30 <= 1020; curr += 30) {
      generated.push({
        startTime: formatTime(curr),
        endTime: formatTime(curr + 30),
        isAvailable: true,
      });
    }
    return { isDoctorOnLeave: false, slots: generated };
  },

  async requestLeave({ doctorId, doctorName, date, reason = '' }) {
    const targetDate = String(date).slice(0, 10);
    const requests = getLeaveRequestsFromStorage();

    const newReq = {
      id: `LV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorId: doctorId || 'dr-1',
      doctorName: doctorName || 'Doctor',
      date: targetDate,
      reason: reason || 'Personal Leave',
      status: 'Pending Approval',
      requestedAt: new Date().toISOString(),
    };

    requests.push(newReq);
    saveLeaveRequestsToStorage(requests);

    try {
      notificationService.sendToRole('admin', {
        title: 'New Doctor Leave Request',
        description: `${doctorName} submitted a leave request for ${targetDate}. Admin approval required.`,
        icon: 'event_busy',
        tone: 'warning',
      });
    } catch {
      /* ignore */
    }

    return {
      success: true,
      request: newReq,
      message: 'Leave request submitted successfully. Awaiting Admin Approval.',
    };
  },

  async getLeaveRequests() {
    return getLeaveRequestsFromStorage();
  },

  async approveLeaveRequest(requestId) {
    const requests = getLeaveRequestsFromStorage();
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx < 0) return { success: false, message: 'Leave request not found.' };

    const req = requests[idx];
    req.status = 'Approved';
    req.approvedAt = new Date().toISOString();
    saveLeaveRequestsToStorage(requests);

    // Mark leave in Doctor profile
    const docs = getStoredDoctors();
    const reqDocId = (req.doctorId || '').toLowerCase();
    const reqDocName = (req.doctorName || '').toLowerCase().replace('dr. ', '');

    docs.forEach((d) => {
      const dId = String(d.id || d.doctorId || '').toLowerCase();
      const dName = String(d.name || '').toLowerCase().replace('dr. ', '');
      const isMatch = (reqDocId && (dId === reqDocId || dId.includes(reqDocId))) || (reqDocName && dName && (dName.includes(reqDocName) || reqDocName.includes(dName)));
      if (isMatch) {
        if (!d.leaveDays) d.leaveDays = [];
        if (!d.leaveDays.includes(req.date)) {
          d.leaveDays.push(req.date);
        }
        d.status = 'On Leave';
      }
    });
    saveDoctors(docs);

    // Cancel affected appointments and notify patients via In-App & Email
    const existing = await appointmentService.getAppointments({ status: 'upcoming' });

    const affected = existing.filter((a) => {
      const isSameDate = String(a.date).slice(0, 10) === req.date;
      const aptDocId = String(a.doctorId || a.doctor?.id || '').toLowerCase();
      const aptDocName = String(a.doctorName || a.doctor?.name || '').toLowerCase();
      const docMatch =
        (reqDocId && (aptDocId === reqDocId || aptDocId.includes(reqDocId))) ||
        (reqDocName && (aptDocName.includes(reqDocName) || reqDocName.includes(aptDocName)));
      return isSameDate && docMatch;
    });

    for (const apt of affected) {
      await appointmentService.cancel(apt.id, `Cancelled - Dr. ${req.doctorName} on approved leave`);

      const pid = apt.patientId || apt.patient?.id;

      // 1. Send In-App Notification to Patient
      try {
        if (pid) {
          notificationService.sendToUser(pid, {
            title: 'Appointment Cancelled - Doctor on Leave',
            description: `Your appointment on ${req.date} at ${apt.startTime} was cancelled because Dr. ${req.doctorName} is on approved leave (${req.reason}). Please log in to choose another date.`,
            icon: 'event_busy',
            tone: 'error',
          });
        }
      } catch (e) {
        console.warn(e);
      }

      // 2. Trigger Backend SMTP Email Notification
      try {
        api.post(`/appointments/${apt.id}/cancel`, { reason: `Doctor on Approved Leave (${req.reason})` }).catch(() => {});
      } catch {
        /* ignore */
      }
    }

    return {
      success: true,
      requestId,
      affectedCount: affected.length,
      message: `Leave approved for ${req.doctorName}. ${affected.length} affected appointment(s) cancelled and patients notified via email & in-app alerts.`,
    };
  },

  async rejectLeaveRequest(requestId, reason = '') {
    const requests = getLeaveRequestsFromStorage();
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx >= 0) {
      requests[idx].status = 'Rejected';
      requests[idx].rejectionReason = reason;
      saveLeaveRequestsToStorage(requests);
    }
    return { success: true, message: 'Leave request rejected.' };
  },

  async patientAcceptReschedule(appointmentId) {
    const apts = await appointmentService.getAppointments();
    const apt = apts.find((a) => a.id === appointmentId);
    if (apt && apt.rescheduledDate) {
      await appointmentService.update(appointmentId, {
        date: apt.rescheduledDate,
        status: 'upcoming',
        rescheduledDate: null,
        rescheduledReason: null,
      });
      return { success: true, newDate: apt.rescheduledDate };
    }
    return { success: false, message: 'Appointment not found' };
  },

  async patientCancelReschedule(appointmentId, reason = 'Patient declined rescheduled slot') {
    return appointmentService.cancel(appointmentId, reason);
  },

  async markLeave(doctorId, dateStr, reason = '') {
    const docs = getStoredDoctors();
    const doc = docs.find((d) => d.id === doctorId || d.doctorId === doctorId || d._id === doctorId);
    const doctorName = doc?.name || 'Doctor';

    const reqRes = await this.requestLeave({ doctorId, doctorName, date: dateStr, reason });
    if (reqRes.success && reqRes.request) {
      return this.approveLeaveRequest(reqRes.request.id);
    }
    return reqRes;
  },

  async toggleStatus(id) {
    if (isMockMode()) {
      await sleep(200);
      const docs = getStoredDoctors();
      const doc = docs.find((d) => d.id === id || d.doctorId === id);
      if (doc) {
        doc.status = doc.status === 'Online' ? 'Offline' : 'Online';
        saveDoctors(docs);
      }
      return { id, status: doc?.status };
    }
    const { data } = await api.post(`/doctors/${id}/toggle-status`);
    return data;
  },

  async updateAvailability(status) {
    if (isMockMode()) {
      await sleep(200);
      return { availability: { status } };
    }
    const { data } = await api.put('/doctors/me/availability', { status });
    return data;
  },
};

export default doctorService;
