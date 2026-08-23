import mongoose from 'mongoose';

export const TRIAGE_LEVELS = Object.freeze(['priority', 'standard', 'routine']);
export const CASE_SOURCES = Object.freeze(['ai', 'clinician']);

const differentialSchema = new mongoose.Schema(
  {
    condition: { type: String, required: true },
    likelihood: {
      type: String,
      enum: ['High', 'Moderate', 'Low'],
      default: 'Low',
    },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const warningSignSchema = new mongoose.Schema(
  {
    finding: { type: String, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const referralSchema = new mongoose.Schema(
  {
    destination: { type: String, default: '' },
    priority: { type: String, default: '' },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * Persistent clinical case file. Stores the submitted case, symptoms,
 * triage result, AI clinical summary, possible conditions, clinical
 * warning signs, recommendations and confidence score so the Case Report
 * (and admin analytics) read from the database instead of temporary data.
 */
const caseFileSchema = new mongoose.Schema(
  {
    caseId: {
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
    patientRefId: {
      type: String,
      index: true,
      default: '',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      index: true,
    },
    doctorInfo: {
      name: { type: String, default: '' },
      specialization: { type: String, default: '' },
      facility: { type: String, default: '' },
    },
    status: { type: String, default: '' },
    triageLevel: {
      type: String,
      enum: TRIAGE_LEVELS,
      default: 'standard',
      index: true,
    },
    complaint: { type: String, default: '' },
    reportedSymptoms: { type: [String], default: [] },
    negativeFindings: { type: [String], default: [] },
    clinicalSummary: { type: String, default: '' },
    differentials: {
      type: [differentialSchema],
      default: [],
    },
    warningSigns: {
      type: [warningSignSchema],
      default: [],
    },
    followupQuestions: { type: [String], default: [] },
    nextStep: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    consultationSummary: { type: String, default: '' },
    consultationNotes: { type: String, default: '' },
    consultationApproved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    referral: {
      type: referralSchema,
      default: null,
    },
    source: {
      type: String,
      enum: CASE_SOURCES,
      default: 'ai',
    },
    generatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

caseFileSchema.pre('save', async function ensureId(next) {
  if (!this.caseId) {
    const { generateId } = await import('../utils/generateId.js');
    this.caseId = generateId('CASE-');
  }
  return next();
});

export const CaseFile = mongoose.model('CaseFile', caseFileSchema);
export default CaseFile;
