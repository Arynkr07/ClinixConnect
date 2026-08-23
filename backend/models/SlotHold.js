import mongoose from 'mongoose';

const slotHoldSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes expired holds
    },
  },
  {
    timestamps: true,
  }
);

slotHoldSchema.index({ doctor: 1, date: 1, startTime: 1 }, { unique: true });

export const SlotHold = mongoose.model('SlotHold', slotHoldSchema);
export default SlotHold;
