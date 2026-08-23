import mongoose from 'mongoose';
import {
  Patient,
  Doctor,
  Referral,
  HealthCamp,
  Appointment,
} from '../models/index.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Aggregates the dashboard payloads consumed by the doctor, NGO and
 * government portals. Each controller picks the slices it needs.
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

export const buildNGODashboard = async ({ ngoId }) => {
  const objectId = new mongoose.Types.ObjectId(ngoId);

  const [camps, campStats] = await Promise.all([
    HealthCamp.find({ ngo: objectId }).sort({ date: -1 }).limit(5).lean(),
    HealthCamp.aggregate([{ $match: { ngo: objectId } }]),
  ]);

  const completed = campStats.filter((c) => c.status === 'completed');
  const beneficiaries = completed.reduce((sum, c) => sum + (c.beneficiaries || 0), 0);
  const planned = campStats.filter((c) => c.status === 'planned').length;
  const vaccinationCamps = campStats.filter((c) => c.services?.includes('vaccination')).length;

  return {
    campsConducted: completed.length,
    beneficiariesServed: beneficiaries,
    activeVolunteers: planned,
    vaccinationsDelivered: vaccinationCamps,
    upcomingCamps: camps.filter((c) => c.status === 'planned' || c.status === 'active'),
  };
};

export const buildGovernmentDashboard = async ({ district }) => {
  const [patients, doctors, referrals, activeCamps] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Referral.countDocuments({ status: { $in: ['sent', 'accepted'] } }),
    HealthCamp.countDocuments({ status: { $in: ['planned', 'active'] } }),
  ]);

  return {
    district: district || 'Default District',
    patients,
    doctors,
    referrals,
    activeCamps,
  };
};

export const dashboardService = {
  buildDoctorDashboard,
  buildNGODashboard,
  buildGovernmentDashboard,
};

export default dashboardService;
