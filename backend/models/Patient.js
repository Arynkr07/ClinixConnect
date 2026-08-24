import mongoose from 'mongoose';

export const VILLAGES = Object.freeze([
  'Amroli',
  'Palia',
  'Devgram',
  'Kanker East',
  'Dhamtari Rural',
  'Lormi Block',
  'Bijapur Sector 2',
]);

export const RISK_LEVELS = Object.freeze(['low', 'moderate', 'high', 'critical']);
export const QUEUE_STATUSES = Object.freeze([
  'waiting',
  'inReview',
  'scheduled',
  'completed',
]);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
    alternate: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    bp: { type: String, default: '' }, // e.g. "120/80"
    temp: { type: String, default: '' }, // e.g. "98.6°F"
    weight: { type: Number, default: null },
    pulse: { type: Number, default: null },
    bloodSugar: { type: Number, default: null },
    bmi: { type: Number, default: null },
  },
  { _id: false }
);

const allergySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      default: 'moderate',
    },
    reaction: { type: String, default: '' },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,   // Optional: walk-in patients may not have a User account
      default: null,
      index: true,
    },
    patientId: {
      type: String,
      unique: true,
      index: true,
    },
    personalInfo: {
      fullName: { type: String, default: '' },
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      village: { type: String, enum: [...VILLAGES, ''], default: '' },
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },
    bloodGroup: { type: String, default: '' },
    height: { type: Number, default: null }, // cm
    allergies: {
      type: [allergySchema],
      default: [],
    },
    medicalHistory: {
      diagnoses: { type: [String], default: [] },
      surgeries: { type: [String], default: [] },
      medications: { type: [String], default: [] },
      chronic: { type: [String], default: [] },
    },
    vaccinationHistory: { type: [String], default: [] },
    queue: {
      risk: { type: String, enum: RISK_LEVELS, default: 'low' },
      status: { type: String, enum: QUEUE_STATUSES, default: 'waiting' },
      reason: { type: String, default: '' },
      joinedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.age = ret.personalInfo?.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(ret.personalInfo.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
        delete ret._id;
        return ret;
      },
    },
  }
);

patientSchema.pre('save', async function ensureId(next) {
  if (!this.patientId) {
    const { generatePatientId } = await import('../utils/generateId.js');
    this.patientId = generatePatientId(this.personalInfo?.fullName || this.name, this.createdAt || new Date());
  }
  return next();
});

export const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
