import mongoose from 'mongoose';

export const CONSULTATION_STATUSES = Object.freeze([
  'scheduled',
  'inProgress',
  'completed',
  'followUp',
  'reviewed',
  'cancelled',
]);

export const SCRIBE_SECTION_IDS = Object.freeze([
  'chiefComplaint',
  'historyOfPresentIllness',
  'symptoms',
  'vitalsDiscussed',
  'assessment',
  'plan',
  'medicationAdvice',
  'followUp',
]);

const scribeSectionSchema = new mongoose.Schema(
  {
    id: { type: String, enum: SCRIBE_SECTION_IDS, required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
  },
  { _id: false }
);

const medicineEntrySchema = new mongoose.Schema(
  {
    medicineName: { type: String, default: '' },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      default: 'scheduled',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    complaint: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    vitals: {
      bp: { type: String, default: '' },
      temp: { type: String, default: '' },
      pulse: { type: Number, default: null },
      spo2: { type: Number, default: null },
    },
    medicines: {
      type: [medicineEntrySchema],
      default: [],
    },
    notes: { type: String, default: '' },
    advice: { type: String, default: '' },
    transcript: { type: String, default: '' },
    scribeSections: {
      type: [scribeSectionSchema],
      default: [],
    },
    recordingUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

consultationSchema.pre('save', async function ensureId(next) {
  if (!this.sessionId) {
    const { generateConsultationId } = await import('../utils/generateId.js');
    this.sessionId = generateConsultationId();
  }
  return next();
});

export const Consultation = mongoose.model('Consultation', consultationSchema);
export default Consultation;
