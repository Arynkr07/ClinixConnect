import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: String,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    specialization: { type: String, default: 'General Medicine' },
    hospital: { type: String, default: '' },
    experience: { type: Number, default: 0 }, // years
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    availability: {
      status: { type: String, enum: ['online', 'offline', 'busy'], default: 'online' },
      days: {
        type: [String],
        enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        default: ['mon', 'tue', 'wed', 'thu', 'fri'],
      },
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    slotDuration: { type: Number, default: 30 }, // in minutes
    leaveDays: {
      type: [Date],
      default: [],
    },
    stats: {
      patients: { type: Number, default: 0 },
      consultations: { type: Number, default: 0 },
      followUps: { type: Number, default: 0 },
      avgWaitMinutes: { type: Number, default: 0 },
    },
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

doctorSchema.pre('save', async function ensureId(next) {
  if (!this.doctorId) {
    const { generateDoctorId } = await import('../utils/generateId.js');
    this.doctorId = generateDoctorId();
  }
  return next();
});

export const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
