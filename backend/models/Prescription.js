import mongoose from 'mongoose';

export const PRESCRIPTION_STATUSES = Object.freeze([
  'active',
  'completed',
  'dispensed',
]);

const medicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' }, // e.g. "7 days"
    durationDays: { type: Number, default: 7 },
    schedule: {
      morning: { type: Boolean, default: false },
      afternoon: { type: Boolean, default: false },
      night: { type: Boolean, default: false },
    },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
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
    diagnosis: { type: String, default: '' },
    advice: { type: String, default: '' },
    medicines: {
      type: [medicineSchema],
      default: [],
    },
    status: {
      type: String,
      enum: PRESCRIPTION_STATUSES,
      default: 'active',
      index: true,
    },
    issuedAt: { type: Date, default: Date.now },
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

prescriptionSchema.pre('save', async function ensureId(next) {
  if (!this.prescriptionId) {
    const { generatePrescriptionId } = await import('../utils/generateId.js');
    this.prescriptionId = generatePrescriptionId();
  }
  return next();
});

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
