import mongoose from 'mongoose';

export const REFERRAL_PRIORITIES = Object.freeze(['normal', 'high', 'urgent']);
export const REFERRAL_STATUSES = Object.freeze([
  'sent',
  'accepted',
  'rejected',
  'completed',
]);

export const REFERRAL_DESTINATIONS = Object.freeze([
  { code: 'agh', label: 'District Hospital (AGH)' },
  { code: 'dcc', label: 'Community Health Centre (DCC)' },
  { code: 'drr', label: 'District Referral Centre (DRR)' },
]);

const referralSchema = new mongoose.Schema(
  {
    referralId: {
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
    destination: {
      type: String,
      enum: REFERRAL_DESTINATIONS.map((d) => d.code),
      required: true,
    },
    priority: {
      type: String,
      enum: REFERRAL_PRIORITIES,
      default: 'normal',
    },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      default: 'sent',
      index: true,
    },
    respondedAt: { type: Date, default: null },
    responseNotes: { type: String, default: '' },
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

referralSchema.pre('save', async function ensureId(next) {
  if (!this.referralId) {
    const { generateReferralId } = await import('../utils/generateId.js');
    this.referralId = generateReferralId();
  }
  return next();
});

export const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
