import mongoose from 'mongoose';

export const ASHA_STATUSES = Object.freeze(['Active', 'Inactive']);

const ashaWorkerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ASHA_STATUSES,
      default: 'Active',
    },
    households: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    visits: { type: Number, default: 0 },
    lastSync: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret.workerId || ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

export const AshaWorker = mongoose.model('AshaWorker', ashaWorkerSchema);
export default AshaWorker;