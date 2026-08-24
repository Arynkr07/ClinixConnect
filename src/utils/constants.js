export const APP_NAME = 'ClinixConnect';
export const APP_TAGLINE = 'Rural Community Care';

export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  doctor: 'Doctor',
  patient: 'Patient',
};

export const ROLE_META = {
  patient: {
    label: 'Patient',
    icon: 'personal_injury',
    description: 'Book appointments, symptoms & prescriptions',
    color: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
  doctor: {
    label: 'Doctor',
    icon: 'stethoscope',
    description: 'Consultations, prescriptions & referrals',
    color: 'bg-secondary-container text-on-secondary-container',
  },
  admin: {
    label: 'Admin',
    icon: 'admin_panel_settings',
    description: 'Platform administration',
    color: 'bg-error-container text-on-error-container',
  },
};

export const REGISTRATION_ROLES = ['patient', 'doctor'];

export const ROLE_PORTAL = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
};

export const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
  'Gynecology',
  'Neurology',
  'Pulmonology',
  'ENT Specialist',
  'Ophthalmology',
];

export const DOCTOR_SHIFTS = [
  { id: 'Day Shift', label: 'Day Shift (09:00 – 17:00)', start: '09:00', end: '17:00', icon: 'wb_sunny' },
  { id: 'Night Shift', label: 'Night Shift (21:00 – 05:00)', start: '21:00', end: '05:00', icon: 'nights_stay' },
  { id: 'Custom', label: 'Custom Working Hours', start: '09:00', end: '17:00', icon: 'schedule' },
];

export const SLOT_DURATIONS = [15, 30, 45, 60];

export const RISK_LEVELS = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

/**
 * Triage classification for the patient queue (red/yellow/green).
 * Higher risk maps to a higher-priority triage colour.
 */
export const TRIAGE_BY_RISK = {
  Critical: 'red',
  High: 'yellow',
  Moderate: 'yellow',
  Low: 'green',
};

/** Queue ordering: most urgent first (used to sort the queue). */
export const RISK_ORDER = ['Critical', 'High', 'Moderate', 'Low'];

/** Colour badge/tag styles per triage category. */
export const TRIAGE_STYLES = {
  red: 'bg-error-container text-on-error-container border border-error/30',
  yellow: 'bg-secondary-container text-on-secondary-container border border-secondary/30',
  green: 'bg-success-container text-on-success-container border border-success/30',
};

export const TRIAGE_LABEL_KEYS = {
  red: 'queue.triageRed',
  yellow: 'queue.triageYellow',
  green: 'queue.triageGreen',
};

export const RISK_STYLES = {
  Low: 'bg-primary-fixed text-on-primary-fixed-variant',
  Moderate: 'bg-secondary-container text-on-secondary-container',
  High: 'bg-tertiary-fixed-dim text-tertiary',
  Critical: 'bg-error-container text-on-error-container',
};

export const QUEUE_STATUS = {
  WAITING: 'Waiting',
  IN_REVIEW: 'In Review',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
};

export const VISIT_PURPOSES = [
  'General Checkup',
  'Prenatal Checkup',
  'Postnatal Checkup',
  'Vaccination',
  'Fever / Illness',
  'Chronic Condition Monitoring',
  'Follow-up',
  'Screening Camp',
];

export const DEFAULT_VILLAGES = [
  'Amroli',
  'Palia',
  'Devgram',
  'Kanker East',
  'Dhamtari Rural',
  'Lormi Block',
  'Bijapur Sector 2',
];

export const MEDICATION_SUGGESTIONS = [
  'Paracetamol',
  'Cetirizine',
  'ORS',
  'Amoxicillin',
  'Ibuprofen',
  'Metformin',
  'Amlodipine',
  'Azithromycin',
  'Aspirin',
  'Nitroglycerin',
  'Atorvastatin',
  'Telmisartan',
  'Metoprolol',
  'Pantoprazole',
  'Ondansetron',
  'Ranitidine',
  'Diclofenac',
  'Ciprofloxacin',
  'Doxycycline',
  'Metronidazole',
  'Cefixime',
  'Montelukast',
  'Salbutamol',
  'Ambroxol',
  'Dextromethorphan',
  'Vitamin D3',
  'Vitamin B12',
  'Folic Acid',
  'Iron (Ferrous Sulphate)',
  'Calcium Carbonate',
  'Fluoxetine',
  'Alprazolam',
  'Levothyroxine',
  'Hydrochlorothiazide',
  'Losartan',
  'Glimepiride',
  'Insulin',
  'Glibenclamide',
  'Piroxicam',
  'Ceftriaxone',
  'Chlorpheniramine',
  'Budesonide',
  'Prednisolone',
  'Furosemide',
  'Gabapentin',
  'Tramadol',
  'Cetirizine Syrup',
  'Albendazole',
  'Praziquantel',
  'Zinc',
];



export const COMMON_MEDICINE_SCHEDULES = ['Morning', 'Afternoon', 'Night'];

export const DEFAULT_PER_PAGE = 10;

export const DATE_RANGES = ['Last 24 Hours', 'Last 30 Days', 'Last 6 Months', 'Year to Date'];
