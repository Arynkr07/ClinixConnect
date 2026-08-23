import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    language: { type: String, enum: ['en', 'hi', 'gu', 'mr'], default: 'en' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      app: { type: Boolean, default: true },
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
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

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
