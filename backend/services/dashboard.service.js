import mongoose from 'mongoose';
import {
  Patient,
  Doctor,
  Referral,
  Appointment,
} from '../models/index.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Aggregates the dashboard payloads consumed by doctor and government portals.
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

export const buildGovernmentDashboard = async ({ district }) => {
  const [patients, doctors, referrals] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Referral.countDocuments({ status: { $in: ['sent', 'accepted'] } }),
  ]);

  return {
    district: district || 'Default District',
    patients,
    doctors,
    referrals,
  };
};

export const dashboardService = {
  buildDoctorDashboard,
  buildGovernmentDashboard,
};

export default dashboardService;
