import { User, Doctor, Patient } from '../models/index.js';

export async function ensureDefaultUsers() {
  try {
    // 1. Admin
    const adminEmail = 'admin@clinixconnect.org';
    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $setOnInsert: {
          role: 'admin',
          name: 'Admin Miller',
          email: adminEmail,
          password: 'admin12345',
          phone: '+91-9999900001',
        },
        $set: { isApproved: true, isActive: true, isMainAdmin: true },
      },
      { upsert: true, new: true }
    );
    console.log('[autoSeed] Default Main Admin ensured (admin@clinixconnect.org)');

    // 2. Doctors Seed Array (including Dr. Kavita Nair)
    const dummyDoctors = [
      {
        id: 'dr-1',
        doctorId: 'dr-1',
        name: 'Dr. Rajesh Sharma',
        email: 'doctor@clinixconnect.org',
        password: 'doctor@123',
        phone: '+91 98765 43210',
        specialization: 'General Medicine',
        hospital: 'Amroli Community Health Centre',
        experience: 12,
        shiftType: 'Day Shift',
        workingHours: { start: '09:00', end: '17:00' },
      },
      {
        id: 'dr-2',
        doctorId: 'dr-2',
        name: 'Dr. Anil Deshmukh',
        email: 'anil.deshmukh@clinixconnect.org',
        password: 'anil@123',
        phone: '+91 98765 43211',
        specialization: 'Cardiology',
        hospital: 'Dhamtari District Hospital',
        experience: 15,
        shiftType: 'Day Shift',
        workingHours: { start: '10:00', end: '16:00' },
      },
      {
        id: 'dr-3',
        doctorId: 'dr-3',
        name: 'Dr. Kavita Nair',
        email: 'kavita.nair@clinixconnect.org',
        password: 'kavita@123',
        phone: '+91 98765 43212',
        specialization: 'Pediatrics',
        hospital: 'Kanker Community Health Centre',
        experience: 9,
        shiftType: 'Day Shift',
        workingHours: { start: '09:30', end: '15:30' },
      },
      {
        id: 'dr-4',
        doctorId: 'dr-4',
        name: 'Dr. Sunita Kapoor',
        email: 'sunita.kapoor@clinixconnect.org',
        password: 'sunita@123',
        phone: '+91 98765 43213',
        specialization: 'Gynecology',
        hospital: 'District Hospital & Maternity Wing',
        experience: 11,
        shiftType: 'Night Shift',
        workingHours: { start: '21:00', end: '05:00' },
      },
      {
        id: 'dr-5',
        doctorId: 'dr-5',
        name: 'Dr. Deepak Verma',
        email: 'deepak.verma@clinixconnect.org',
        password: 'deepak@123',
        phone: '+91 98765 43214',
        specialization: 'Orthopedics',
        hospital: 'Amroli Community Health Centre',
        experience: 8,
        shiftType: 'Day Shift',
        workingHours: { start: '09:00', end: '17:00' },
      },
    ];

    for (const docData of dummyDoctors) {
      let docUser = await User.findOneAndUpdate(
        { email: docData.email },
        {
          $setOnInsert: {
            role: 'doctor',
            name: docData.name,
            email: docData.email,
            password: docData.password,
            phone: docData.phone,
          },
          $set: { isApproved: true, isActive: true },
        },
        { upsert: true, new: true }
      );

      const profileExists = await Doctor.findOne({ email: docData.email });
      if (!profileExists) {
        await Doctor.create({
          user: docUser._id,
          doctorId: docData.doctorId,
          name: docData.name,
          email: docData.email,
          phone: docData.phone,
          specialization: docData.specialization,
          hospital: docData.hospital,
          experience: docData.experience,
          shiftType: docData.shiftType,
          workingHours: docData.workingHours,
          slotDuration: 30,
          leaveDays: [],
          availability: { status: 'online' },
          verification: 'Verified',
        });
      }
    }

    // 3. Dummy Patients Seed Array
    const dummyPatients = [
      {
        name: 'Gopal Prasad',
        email: 'patient@clinixconnect.org',
        password: 'patient@123',
        phone: '+91 98765 43211',
        patientId: 'Gopal20260824101500',
        village: 'Amroli',
      },
      {
        name: 'Sunita Devi',
        email: 'sunita@clinixconnect.org',
        password: 'sunita@123',
        phone: '+91 98765 43222',
        patientId: 'Sunita20260824121530',
        village: 'Devgram',
      },
      {
        name: 'Ramesh Kumar',
        email: 'ramesh@clinixconnect.org',
        password: 'ramesh@123',
        phone: '+91 98765 43233',
        patientId: 'Ramesh20260824091522',
        village: 'Kanker Block',
      },
      {
        name: 'Priya Sahu',
        email: 'priya@clinixconnect.org',
        password: 'priya@123',
        phone: '+91 98765 43244',
        patientId: 'Priya20260824143000',
        village: 'Bijapur Sector',
      },
      {
        name: 'Arjun Singh',
        email: 'arjun@clinixconnect.org',
        password: 'arjun@123',
        phone: '+91 98765 43255',
        patientId: 'Arjun20260824110500',
        village: 'Dhamtari',
      },
      {
        name: 'Meena Sharma',
        email: 'meena@clinixconnect.org',
        password: 'meena@123',
        phone: '+91 98765 43266',
        patientId: 'Meena20260824164500',
        village: 'Amroli',
      },
    ];

    for (const patData of dummyPatients) {
      const patUser = await User.findOneAndUpdate(
        { email: patData.email },
        {
          $setOnInsert: {
            role: 'patient',
            name: patData.name,
            email: patData.email,
            password: patData.password,
            phone: patData.phone,
          },
          $set: { isApproved: true, isActive: true },
        },
        { upsert: true, new: true }
      );

      const patProfile = await Patient.findOne({ patientId: patData.patientId });
      if (!patProfile) {
        await Patient.create({
          user: patUser._id,
          patientId: patData.patientId,
          personalInfo: {
            fullName: patData.name,
            email: patData.email,
            phone: patData.phone,
            village: patData.village,
          },
          vitals: { bp: '120/80', temp: '98.6°F', weight: 62, pulse: 74 },
          queue: { risk: 'low', status: 'waiting', reason: 'Routine Health Checkup' },
        });
      }
    }

    console.log('[autoSeed] Dummy Doctors & Patients seeded with name@123 passwords successfully!');
  } catch (error) {
    console.warn('[autoSeed] Error seeding dummy data:', error.message);
  }
}

export default ensureDefaultUsers;
