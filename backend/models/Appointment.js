import mongoose from 'mongoose';

export const APPOINTMENT_STATUSES = Object.freeze([
  'upcoming',
  'completed',
  'cancelled',
]);

const appointmentSchema = new mongoose.Schema(
  {
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
    purpose: { type: String, default: 'general' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g. "10:00"
    endTime: { type: String, default: '' },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'upcoming',
      index: true,
    },
    notes: { type: String, default: '' },
    symptoms: { type: String, default: '' },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
    },
    chiefComplaint: { type: String, default: '' },
    suggestedQuestions: { type: [String], default: [] },
    preVisitSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    postVisitSummary: { type: String, default: '' },
    googleCalendarEventId: { type: String, default: '' },
    googleCalendarLink: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: '' },
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

appointmentSchema.index({ doctor: 1, date: 1, startTime: 1 });
appointmentSchema.index({ patient: 1, date: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
