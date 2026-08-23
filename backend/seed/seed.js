import connectDB from '../config/db.js';
import {
  User,
  Patient,
  Doctor,
  NGO,
  Government,
  Appointment,
  Prescription,
  Consultation,
  MedicalReport,
  Notification,
  Settings,
  Referral,
  HealthCamp,
  CaseFile,
  Village,
  AshaWorker,
} from '../models/index.js';

const PASSWORD = 'Password@123'; // shared demo pass

const users = [
  { role: 'admin', name: 'Admin Miller', email: 'admin@jeevandoot.org' },
  { role: 'doctor', name: 'Dr. Rajesh Sharma', email: 'doctor@jeevandoot.org' },
  { role: 'patient', name: 'Registered Patient', email: 'patient@jeevandoot.org' },
  { role: 'ngo', name: 'Seva Foundation', email: 'ngo@jeevandoot.org' },
  { role: 'government', name: 'District Health Office', email: 'govt@jeevandoot.org' },
];

const patients = [
  {
    name: 'Gopal Prasad',
    patientId: 'JD-1209',
    village: 'Amroli',
    gender: 'male',
    risk: 'moderate',
    status: 'inReview',
  },
  {
    name: 'Arjun Singh',
    patientId: 'JD-8F2KQ3',
    village: 'Palia',
    gender: 'male',
    risk: 'high',
    status: 'waiting',
  },
  {
    name: 'Meera Sharma',
    patientId: 'JD-5XA2MN',
    village: 'Devgram',
    gender: 'female',
    risk: 'low',
    status: 'completed',
  },
  {
    name: 'Lakshmi Verma',
    patientId: 'JD-7K4PQ9',
    village: 'Dhamtari Rural',
    gender: 'female',
    risk: 'critical',
    status: 'waiting',
  },
];

const doctors = [
  { name: 'Dr. Rajesh Sharma', specialization: 'General Medicine', hospital: 'Amroli PHC', experience: 12, status: 'online' },
  { name: 'Dr. Anil Deshmukh', specialization: 'Cardiology', hospital: 'Dhamtari District Hospital', experience: 18, status: 'online' },
  { name: 'Dr. Kavita Nair', specialization: 'Pediatrics', hospital: 'Kanker CHC', experience: 9, status: 'offline' },
];

const villageNames = [
  'Amroli',
  'Palia',
  'Devgram',
  'Kanker East',
  'Dhamtari Rural',
  'Lormi Block',
  'Bijapur Sector 2',
];

const ashaWorkers = [
  { workerId: 'AW-1101', name: 'Sunita Devi', village: 'Amroli', households: 142, lastSync: '5 min ago', status: 'Active', score: 92, visits: 214 },
  { workerId: 'AW-1102', name: 'Reena Yadav', village: 'Palia', households: 118, lastSync: '20 min ago', status: 'Active', score: 87, visits: 176 },
  { workerId: 'AW-1103', name: 'Kavita Nishad', village: 'Devgram', households: 96, lastSync: '2 hrs ago', status: 'Inactive', score: 61, visits: 98 },
  { workerId: 'AW-1104', name: 'Meena Sahu', village: 'Kanker East', households: 131, lastSync: '12 min ago', status: 'Active', score: 89, visits: 205 },
  { workerId: 'AW-1105', name: 'Anita Verma', village: 'Bijapur Sector 2', households: 87, lastSync: '45 min ago', status: 'Active', score: 84, visits: 154 },
  { workerId: 'AW-1106', name: 'Seema Bhoi', village: 'Lormi Block', households: 74, lastSync: '1 day ago', status: 'Inactive', score: 55, visits: 61 },
];

const run = async (reset = false) => {
  await connectDB();

  if (reset) {
    console.log('[seed] Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      NGO.deleteMany({}),
      Government.deleteMany({}),
      Appointment.deleteMany({}),
      Prescription.deleteMany({}),
      Consultation.deleteMany({}),
      MedicalReport.deleteMany({}),
      Notification.deleteMany({}),
      Settings.deleteMany({}),
      Referral.deleteMany({}),
      HealthCamp.deleteMany({}),
      CaseFile.deleteMany({}),
      Village.deleteMany({}),
      AshaWorker.deleteMany({}),
    ]);
  }

  const userDocs = [];
  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      userDocs.push(existing);
      continue;
    }
    const created = await User.create({ ...u, password: PASSWORD });
    userDocs.push(created);
  }

  const byRole = userDocs.reduce((acc, u) => {
    acc[u.role] = u;
    return acc;
  }, {});

  // --- Doctor profiles ---
  const doctorDocs = [];
  for (let i = 0; i < doctors.length; i += 1) {
    const d = doctors[i];
    const user = i === 0 ? byRole.doctor : await User.create({
      role: 'doctor',
      name: d.name,
      email: `${d.name.toLowerCase().replace(/[^a-z]+/g, '.')}@jeevandoot.org`,
      password: PASSWORD,
    });
    const doctor = await Doctor.create({
      user: user._id,
      name: d.name,
      specialization: d.specialization,
      hospital: d.hospital,
      experience: d.experience,
      email: user.email,
      workingHours: { start: '09:00', end: '17:00' },
      slotDuration: 30,
      leaveDays: i === 2 ? [new Date(Date.now() + 5 * 86400000)] : [],
      availability: { status: d.status },
      stats: { patients: 45 + i * 12, consultations: 120 + i * 40, followUps: 8 + i * 3 },
    });
    doctorDocs.push(doctor);
  }
  const [drSharma, drDeshmukh, drNair] = doctorDocs;

  // --- Patient profiles (linked users) ---
  const patientDocs = [];
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    const user =
      i === 0
        ? byRole.patient
        : await User.create({
            role: 'patient',
            name: p.name,
            email: `${p.name.toLowerCase().replace(/[^a-z]+/g, '.')}@jeevandoot.org`,
            password: PASSWORD,
          });

    const patient = await Patient.create({
      user: user._id,
      patientId: p.patientId,
      personalInfo: {
        fullName: p.name,
        dateOfBirth: new Date('1978-05-12'),
        gender: p.gender,
        email: user.email,
        phone: `+91-9${Math.floor(Math.random() * 9e8)}`,
        address: `${p.village}, Dhamtari District`,
        village: p.village,
      },
      emergencyContact: {
        name: 'Family Member',
        relationship: 'Spouse',
        phone: '+91-9999990001',
      },
      vitals: { bp: '128/84', temp: '98.6°F', weight: 62, pulse: 76, bmi: 23.4 },
      bloodGroup: 'B+',
      height: 168,
      allergies: [{ name: 'Penicillin', severity: 'high', reaction: 'Rash' }],
      medicalHistory: {
        diagnoses: ['Hypertension'],
        surgeries: [],
        medications: ['Amlodipine 5mg'],
        chronic: ['Hypertension'],
      },
      vaccinationHistory: ['COVID-19 (2 doses)', 'Tetanus (booster)'],
      queue: { risk: p.risk, status: p.status, reason: 'Routine check-up', joinedAt: new Date() },
    });
    patientDocs.push(patient);
  }
  const [gopal, arjun, meera, lakshmi] = patientDocs;

  // --- Appointments ---
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  };
  const nextWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  };

  await Appointment.create([
    {
      patient: gopal._id,
      doctor: drSharma._id,
      purpose: 'Fever & Respiratory Illness',
      date: tomorrow(),
      startTime: '10:00',
      endTime: '10:30',
      status: 'upcoming',
      symptoms: 'High fever, persistent cough, and mild shortness of breath for 2 days.',
      urgency: 'High',
      chiefComplaint: 'Acute viral fever and dry cough with exertional breathlessness.',
      suggestedQuestions: [
        'How many days has the fever persisted?',
        'Are there associated chills or chest discomfort?',
        'Have you taken antipyretics today?',
      ],
      googleCalendarLink: 'https://calendar.google.com',
    },
    {
      patient: meera._id,
      doctor: drSharma._id,
      purpose: 'General checkup',
      date: nextWeek(),
      startTime: '11:00',
      endTime: '11:30',
      status: 'upcoming',
      symptoms: 'Mild fatigue and seasonal allergies.',
      urgency: 'Low',
      chiefComplaint: 'Routine checkup and seasonal rhinitis.',
      suggestedQuestions: ['Are symptoms worse in the morning?'],
      googleCalendarLink: 'https://calendar.google.com',
    },
    {
      patient: arjun._id,
      doctor: drDeshmukh._id,
      purpose: 'Cardiac referral review',
      date: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed',
      symptoms: 'Exertional chest discomfort.',
      urgency: 'High',
      chiefComplaint: 'Atypical chest tightness on moderate exertion.',
      suggestedQuestions: ['Does pain radiate to the left arm?'],
      postVisitSummary: 'Patient evaluated with 12-lead ECG. Sinus rhythm, no acute ST changes. Prescribed Aspirin and Atorvastatin. Follow-up in 2 weeks.',
      googleCalendarLink: 'https://calendar.google.com',
    },
  ]);

  // --- Prescriptions ---
  await Prescription.create([
    {
      patient: gopal._id,
      doctor: drSharma._id,
      diagnosis: 'Hypertension',
      advice: 'Low-salt diet, daily 30 min walk, follow up in 15 days.',
      medicines: [
        { medicineName: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily', durationDays: 15, schedule: { morning: true } },
        { medicineName: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Twice daily', durationDays: 5, schedule: { morning: true, night: true } },
      ],
      status: 'active',
    },
    {
      patient: meera._id,
      doctor: drSharma._id,
      diagnosis: 'Acute upper respiratory infection',
      advice: 'Rest, fluids, steam inhalation.',
      medicines: [
        { medicineName: 'Azithromycin 500mg', dosage: '1 tablet', frequency: 'Once daily', durationDays: 3, schedule: { morning: true } },
      ],
      status: 'completed',
    },
  ]);

  // --- Consultations ---
  await Consultation.create({
    patient: meera._id,
    doctor: drSharma._id,
    status: 'completed',
    complaint: 'Fever and sore throat for 3 days',
    diagnosis: 'Acute upper respiratory infection',
    vitals: { bp: '118/76', temp: '100.2°F', pulse: 88, spo2: 98 },
    medicines: [{ medicineName: 'Azithromycin 500mg', dosage: '1 tablet', frequency: 'Once daily', duration: '3 days' }],
    notes: 'Patient responded well. Advised hydration and rest.',
    advice: 'Complete the antibiotic course.',
    transcript: 'AI-transcribed consultation summary.',
    scribeSections: [
      { id: 'chiefComplaint', title: 'Chief Complaint', content: 'Fever and sore throat for 3 days.' },
      { id: 'assessment', title: 'Assessment', content: 'Acute upper respiratory infection.' },
      { id: 'plan', title: 'Plan', content: 'Antibiotics + symptomatic care.' },
    ],
    startedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    endedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 20 * 60000),
    durationMinutes: 20,
  });

  // --- Medical reports ---
  await MedicalReport.create([
    {
      patient: gopal._id,
      doctor: drSharma._id,
      title: 'Complete Blood Count',
      type: 'laboratory',
      facility: 'Amroli PHC Laboratory',
      fields: [
        { name: 'Hemoglobin', value: '13.8', unit: 'g/dL', reference: '13.0–17.0', flag: 'normal' },
        { name: 'WBC Count', value: '11,200', unit: '/μL', reference: '4,000–11,000', flag: 'high' },
        { name: 'Platelets', value: '2.4', unit: 'lakh/μL', reference: '1.5–4.5', flag: 'normal' },
      ],
      findings: ['Mild leukocytosis.'],
      impression: 'Suggestive of mild infection. Clinical correlation advised.',
    },
    {
      patient: lakshmi._id,
      doctor: drDeshmukh._id,
      title: 'Lipid Profile',
      type: 'laboratory',
      facility: 'Dhamtari District Hospital',
      fields: [
        { name: 'Total Cholesterol', value: '248', unit: 'mg/dL', reference: '<200', flag: 'critical' },
        { name: 'LDL', value: '168', unit: 'mg/dL', reference: '<100', flag: 'high' },
      ],
      findings: ['Raised LDL and total cholesterol.'],
      impression: 'Dyslipidemia. Dietary and pharmacological intervention advised.',
    },
  ]);

  // --- Referrals ---
  await Referral.create([
    {
      patient: arjun._id,
      doctor: drSharma._id,
      destination: 'dcc',
      priority: 'high',
      reason: 'Suspected MI — needs cardiac evaluation',
      notes: 'Chest pain with ECG changes. Urgent review requested.',
      status: 'sent',
    },
    {
      patient: lakshmi._id,
      doctor: drDeshmukh._id,
      destination: 'agh',
      priority: 'urgent',
      reason: 'Critical lipid profile, cardiac workup required',
      status: 'accepted',
    },
  ]);

  // --- Case files (persistent clinical case records) ---
  await CaseFile.create([
    {
      patient: meera._id,
      patientRefId: 'JD-5XA2MN',
      doctor: drSharma._id,
      doctorInfo: { name: drSharma.name, specialization: drSharma.specialization, facility: drSharma.hospital },
      status: 'Priority review recommended',
      triageLevel: 'priority',
      complaint: 'Persistent Chest Pain, Shortness of Breath',
      reportedSymptoms: ['Persistent chest pain', 'Shortness of breath on exertion'],
      negativeFindings: ['No fever', 'No cough', 'No radiation of pain to the arm, jaw, or back'],
      clinicalSummary:
        'The patient, a 62-year-old woman, reports persistent chest pain of approximately two days duration together with shortness of breath on exertion. The pain is described as non-radiating. Given her age and the combination of symptoms, cardiac causes should be actively evaluated and excluded before considering other explanations.',
      differentials: [
        { condition: 'Acute coronary syndrome', likelihood: 'High', note: 'Chest pain with exertional breathlessness in a patient over 60 years requires urgent evaluation to rule out a cardiac event.' },
        { condition: 'Gastroesophageal reflux disease (GERD)', likelihood: 'Moderate', note: 'Can present with chest discomfort; it should be considered if cardiac causes are excluded.' },
        { condition: 'Musculoskeletal chest pain', likelihood: 'Low', note: 'Less likely given the exertional nature of the pain; can be reconsidered if pain persists without cardiac findings.' },
      ],
      warningSigns: [
        { finding: 'Chest pain combined with shortness of breath', reason: 'This combination may indicate an evolving cardiac event and requires immediate assessment.' },
        { finding: 'Age above 60 years with new chest symptoms', reason: 'Advancing age increases the likelihood of serious cardiovascular disease and warrants prompt evaluation.' },
      ],
      followupQuestions: [
        'Does the pain radiate to the left arm or jaw?',
        'Is the pain relieved by rest or by medication?',
        'Has there been any episode of sweating, nausea, or fainting?',
      ],
      nextStep:
        'Recommend an ECG and urgent cardiology consultation. The patient should be advised to present for review without delay if the pain recurs or worsens.',
      recommendation: 'ECG and urgent cardiology consultation.',
      confidence: 0.88,
      referral: {
        destination: 'dcc',
        priority: 'urgent',
        reason: 'Suspected cardiac event — ECG and specialist review required',
        notes: 'Urgent cardiology consultation requested.',
      },
      source: 'ai',
      generatedAt: new Date(Date.now() - 5 * 3600 * 1000),
    },
    {
      patient: gopal._id,
      patientRefId: 'JD-1209',
      doctor: drSharma._id,
      doctorInfo: { name: drSharma.name, specialization: drSharma.specialization, facility: drSharma.hospital },
      status: 'Priority review recommended',
      triageLevel: 'priority',
      complaint: 'Acute Abdominal Pain, Vomiting',
      reportedSymptoms: ['Acute abdominal pain', 'Repeated vomiting'],
      negativeFindings: [],
      clinicalSummary:
        'The patient, a 78-year-old man, presents with acute abdominal pain and repeated vomiting of one day duration. His age and presentation raise concern for dehydration and for surgical or vascular causes. Abdominal imaging is needed to exclude obstruction, and vascular causes should be considered given his age.',
      differentials: [
        { condition: 'Acute gastroenteritis', likelihood: 'High', note: 'A common cause of acute abdominal pain with vomiting; reassess after hydration.' },
        { condition: 'Intestinal obstruction', likelihood: 'Moderate', note: 'Consider given vomiting with abdominal pain; abdominal imaging is needed to exclude this.' },
        { condition: 'Mesenteric ischemia', likelihood: 'Low', note: 'A serious vascular cause that is more likely in the elderly; it requires imaging and clinical correlation.' },
      ],
      warningSigns: [
        { finding: 'Age above 75 years with acute abdominal pain', reason: 'Older patients are at higher risk of serious abdominal conditions and tolerate deterioration poorly.' },
        { finding: 'Vomiting with abdominal pain', reason: 'May indicate obstruction or an acute abdomen and can lead to dehydration and electrolyte imbalance.' },
        { finding: 'Possible dehydration', reason: 'Repeated vomiting in an elderly patient can lead to significant fluid loss; hydration status should be assessed.' },
      ],
      followupQuestions: [
        'When was your last bowel movement?',
        'Is the pain constant or crampy?',
        'Have you passed gas today?',
      ],
      nextStep:
        'Recommend IV hydration and abdominal imaging, such as ultrasound or X-ray, to exclude obstruction. Clinically reassess for signs of an acute abdomen and consider surgical consultation if the findings are concerning.',
      recommendation: 'IV hydration and abdominal imaging.',
      confidence: 0.86,
      referral: null,
      source: 'ai',
      generatedAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
    {
      patient: arjun._id,
      patientRefId: 'JD-8F2KQ3',
      doctor: drNair._id,
      doctorInfo: { name: drNair.name, specialization: drNair.specialization, facility: drNair.hospital },
      status: 'Standard review recommended',
      triageLevel: 'standard',
      complaint: 'Severe Allergic Reaction (Skin Rash)',
      reportedSymptoms: ['Sudden-onset skin rash with hives'],
      negativeFindings: ['No respiratory distress', 'No facial swelling'],
      clinicalSummary:
        'The patient, a 12-year-old boy, presents with a sudden-onset skin rash and hives consistent with an allergic reaction. No respiratory distress or facial swelling was reported at intake. He should be monitored for progression of the rash and for any respiratory symptoms, and observed for response to antihistamines.',
      differentials: [
        { condition: 'Urticaria', likelihood: 'High', note: 'A common cause of sudden hives; it usually responds to antihistamines.' },
        { condition: 'Drug allergy', likelihood: 'Moderate', note: 'Consider if there was recent exposure to a new medication.' },
        { condition: 'Insect bite reaction', likelihood: 'Low', note: 'Can cause localized hives; consider if a bite was reported.' },
      ],
      warningSigns: [
        { finding: 'Rash spreading or worsening', reason: 'Progression of the rash may indicate a more severe reaction requiring treatment.' },
        { finding: 'Any airway involvement', reason: 'None reported at intake, but swelling of the lips, tongue, or throat requires emergency care if it develops.' },
      ],
      followupQuestions: [
        'Did the rash start after any new medication or food?',
        'At any point, have you felt wheezing or tightness in the throat?',
      ],
      nextStep:
        'Recommend an antihistamine with observation. Advise the patient to seek urgent care immediately for difficulty breathing, swelling of the lips or tongue, or fainting.',
      recommendation: 'Antihistamine with observation.',
      confidence: 0.83,
      referral: null,
      source: 'ai',
      generatedAt: new Date(Date.now() - 1 * 3600 * 1000),
    },
    {
      patient: lakshmi._id,
      patientRefId: 'JD-7K4PQ9',
      doctor: drSharma._id,
      doctorInfo: { name: drSharma.name, specialization: drSharma.specialization, facility: drSharma.hospital },
      status: 'Standard review recommended',
      triageLevel: 'standard',
      complaint: 'High Fever (102°F), Body Aches',
      reportedSymptoms: ['High-grade fever (102°F)', 'Generalized body aches', 'Fatigue'],
      negativeFindings: ['No rash', 'No bleeding tendency'],
      clinicalSummary:
        'The patient, a 45-year-old woman, presents with a high-grade fever of 102°F and generalized body aches for three days. No rash or bleeding tendency has been reported. The presentation is most consistent with a viral febrile illness, while malaria and dengue remain within the differential given the current seasonal context.',
      differentials: [
        { condition: 'Viral febrile illness', likelihood: 'High', note: 'A common seasonal presentation with fever and muscle aches; it is usually self-limiting.' },
        { condition: 'Malaria', likelihood: 'Moderate', note: 'Consider in the current season; confirmation requires a blood smear or rapid test.' },
        { condition: 'Dengue', likelihood: 'Moderate', note: 'Consider given the fever pattern; monitor platelet counts and warning signs.' },
      ],
      warningSigns: [
        { finding: 'Fever above 101.5°F persisting beyond three days', reason: 'Prolonged high fever increases the risk of complications such as dehydration and may indicate a treatable cause that needs investigation.' },
      ],
      followupQuestions: [
        'Have you noticed bleeding gums or small skin spots (petechiae)?',
        'Have you travelled to any high-transmission area recently?',
        'Is the fever continuous or does it come and go?',
      ],
      nextStep:
        'Recommend a malaria / dengue panel and antipyretics with adequate hydration. Advise the patient to return immediately for bleeding, severe headache, or abdominal pain.',
      recommendation: 'Malaria / dengue panel with hydration.',
      confidence: 0.84,
      referral: null,
      source: 'ai',
      generatedAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
  ]);

  // --- Health camps ---
  await HealthCamp.create([
    {
      ngo: ngo._id,
      name: 'Amroli Eye Checkup Camp',
      location: 'Amroli PHC',
      village: 'Amroli',
      doctor: 'Dr. Kavita Nair',
      date: new Date('2026-10-27'),
      status: 'planned',
      beneficiaries: 0,
      services: ['primaryCare', 'awareness'],
    },
    {
      ngo: ngo._id,
      name: 'Devgram Nutrition Camp',
      location: 'Devgram Community Hall',
      village: 'Devgram',
      doctor: 'Dr. Rajesh Sharma',
      date: new Date('2026-07-20'),
      status: 'completed',
      beneficiaries: 214,
      services: ['primaryCare', 'vaccination', 'followUp'],
    },
    {
      ngo: ngo._id,
      name: 'Palia Vaccination Drive',
      location: 'Palia School',
      village: 'Palia',
      doctor: 'Dr. Kavita Nair',
      date: new Date('2026-08-02'),
      status: 'completed',
      beneficiaries: 168,
      services: ['vaccination'],
    },
    {
      ngo: ngo._id,
      name: 'Dhamtari Rural Screening',
      location: 'Dhamtari Rural PHC',
      village: 'Dhamtari Rural',
      doctor: 'Dr. Anil Deshmukh',
      date: new Date('2026-09-14'),
      status: 'active',
      beneficiaries: 96,
      services: ['primaryCare', 'awareness'],
    },
  ]);

  // --- Villages ---
  const villageDocs = [];
  for (const name of villageNames) {
    let village = await Village.findOne({ name });
    if (!village) village = await Village.create({ name });
    villageDocs.push(village);
  }
  const byVillageName = villageDocs.reduce((acc, v) => {
    acc[v.name] = v;
    return acc;
  }, {});

  // --- ASHA Workers ---
  for (const w of ashaWorkers) {
    const existing = await AshaWorker.findOne({ workerId: w.workerId });
    if (existing) continue;
    await AshaWorker.create({
      workerId: w.workerId,
      name: w.name,
      village: byVillageName[w.village]?._id || null,
      households: w.households,
      lastSync: w.lastSync,
      status: w.status,
      score: w.score,
      visits: w.visits,
    });
  }

  // --- Notifications ---
  await Notification.create([
    {
      user: byRole.doctor._id,
      title: 'New patient in queue',
      description: 'Arjun Singh (JD-8F2KQ3) added to your queue.',
      type: 'consultation',
      read: false,
    },
    {
      user: byRole.patient._id,
      title: 'Appointment confirmed',
      description: 'Your appointment with Dr. Rajesh Sharma is confirmed.',
      type: 'appointment',
      read: false,
    },
    {
      user: byRole.patient._id,
      title: 'New prescription available',
      description: 'Prescription issued by Dr. Rajesh Sharma.',
      type: 'prescription',
      read: true,
    },
    {
      user: byRole.ngo._id,
      title: 'New health camp scheduled',
      description: 'Amroli Eye Checkup Camp scheduled for 27 October.',
      type: 'camp',
      read: false,
    },
  ]);

  // --- Settings ---
  await Settings.create({
    user: byRole.patient._id,
    language: 'en',
    theme: 'light',
    notifications: { email: true, sms: true, app: true },
  });

  console.log('[seed] Done. Demo accounts (password: Password@123):');
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  }
  process.exit(0);
};

const reset = process.argv.includes('--reset');
run(reset).catch((error) => {
  console.error('[seed] Failed:', error);
  process.exit(1);
});
