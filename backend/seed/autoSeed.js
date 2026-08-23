import { User, Doctor, Patient } from '../models/index.js';

export async function ensureDefaultUsers() {
  try {
    // 1. Admin
    const adminEmail = 'admin@jeevandoot.org';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        role: 'admin',
        name: 'Admin Miller',
        email: adminEmail,
        password: 'admin12345',
        phone: '+91-9999900001',
      });
      console.log('[autoSeed] Created default Admin (admin@jeevandoot.org / admin12345)');
    }

    // 2. Doctor
    const doctorEmail = 'doctor@jeevandoot.org';
    let doctorUser = await User.findOne({ email: doctorEmail });
    if (!doctorUser) {
      doctorUser = await User.create({
        role: 'doctor',
        name: 'Dr. Rajesh Sharma',
        email: doctorEmail,
        password: 'doctor12345',
        phone: '+91-9876543210',
      });
      console.log('[autoSeed] Created default Doctor user (doctor@jeevandoot.org / doctor12345)');
    }

    const doctorProfile = await Doctor.findOne({ user: doctorUser._id });
    if (!doctorProfile) {
      await Doctor.create({
        user: doctorUser._id,
        doctorId: 'dr-1',
        name: 'Dr. Rajesh Sharma',
        specialization: 'General Medicine',
        hospital: 'Amroli Community Health Centre',
        experience: 12,
        email: doctorEmail,
        workingHours: { start: '09:00', end: '17:00' },
        slotDuration: 30,
        leaveDays: [],
        availability: { status: 'online' },
      });
      console.log('[autoSeed] Created default Doctor profile (Dr. Rajesh Sharma)');
    }

    // 3. Patient
    const patientEmail = 'patient@jeevandoot.org';
    let patientUser = await User.findOne({ email: patientEmail });
    if (!patientUser) {
      patientUser = await User.create({
        role: 'patient',
        name: 'Registered Patient',
        email: patientEmail,
        password: 'patient12345',
        phone: '+91-9876543211',
      });
    }
  } catch (error) {
    console.warn('[autoSeed] Skipping default user seed:', error.message);
  }
}

export default ensureDefaultUsers;
