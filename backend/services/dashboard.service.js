import {
  Patient,
  Doctor,
  Appointment,
} from '../models/index.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Aggregates the dashboard payloads consumed by doctor portal.
 */
export const buildDoctorDashboard = async ({ doctorId }) => {
  const [stats, queue, upcoming] = await Promise.all([
    Doctor.findOne({ _id: doctorId }).lean(),
    Patient.countDocuments({ 'queue.status': { $in: ['waiting', 'inReview'] } }),
    Appointment.countDocuments({
      doctor: doctorId,
      status: 'upcoming',
      date: { $gte: startOfToday() },
    }),
  ]);

  return {
    stats: {
      patients: stats?.stats?.patients ?? 0,
      consultations: stats?.stats?.consultations ?? 0,
      followUps: stats?.stats?.followUps ?? 0,
      queue,
      upcoming,
    },
    queueCount: queue,
  };
};

export const buildSystemDashboard = async () => {
  const [patients, doctors, appointments] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Appointment.countDocuments({ status: 'completed' }),
  ]);

  return {
    patients,
    doctors,
    appointments,
  };
};

export const dashboardService = {
  buildDoctorDashboard,
  buildSystemDashboard,
};

export default dashboardService;
