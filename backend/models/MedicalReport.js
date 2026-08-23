import mongoose from 'mongoose';

export const REPORT_TYPES = Object.freeze([
  'laboratory',
  'radiology',
  'pathology',
  'diagnostic',
]);

export const FLAG_VALUES = Object.freeze(['normal', 'high', 'low', 'critical']);

const reportFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: String, default: '' },
    unit: { type: String, default: '' },
    reference: { type: String, default: '' },
    flag: { type: String, enum: FLAG_VALUES, default: 'normal' },
  },
  { _id: false }
);

const medicalReportSchema = new mongoose.Schema(
  {
    reportId: {
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
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    type: { type: String, enum: REPORT_TYPES, default: 'laboratory' },
    facility: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    fields: {
      type: [reportFieldSchema],
      default: [],
    },
    findings: { type: [String], default: [] },
    impression: { type: String, default: '' },
    filePath: { type: String, default: '' }, // uploaded file (uploads/)
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

medicalReportSchema.pre('save', async function ensureId(next) {
  if (!this.reportId) {
    const { generateReportId } = await import('../utils/generateId.js');
    this.reportId = generateReportId();
  }
  return next();
});

export const MedicalReport = mongoose.model('MedicalReport', medicalReportSchema);
export default MedicalReport;
