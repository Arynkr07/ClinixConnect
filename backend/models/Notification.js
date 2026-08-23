import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = Object.freeze([
  'appointment',
  'prescription',
  'referral',
  'consultation',
  'report',
  'vaccination',
  'camp',
  'donation',
  'system',
]);

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'system',
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
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

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
