import mongoose from 'mongoose';

export const CAMP_STATUSES = Object.freeze(['planned', 'active', 'completed', 'cancelled']);

const healthCampSchema = new mongoose.Schema(
  {
    campId: {
      type: String,
      unique: true,
      index: true,
    },
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    location: { type: String, required: true },
    village: { type: String, default: '' },
    doctor: { type: String, default: '' },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: CAMP_STATUSES,
      default: 'planned',
      index: true,
    },
    beneficiaries: { type: Number, default: 0 },
    services: { type: [String], default: [] }, // e.g. primaryCare, vaccination, awareness, followUp
    notes: { type: String, default: '' },
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

healthCampSchema.pre('save', async function ensureId(next) {
  if (!this.campId) {
    const { generateCampId } = await import('../utils/generateId.js');
    this.campId = generateCampId();
  }
  return next();
});

export const HealthCamp = mongoose.model('HealthCamp', healthCampSchema);
export default HealthCamp;
