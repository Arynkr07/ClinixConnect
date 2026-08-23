import mongoose from 'mongoose';

const governmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    designation: { type: String, default: '' }, // e.g. District Health Officer
    department: { type: String, default: 'Health' },
    district: { type: String, default: '' },
    region: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
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

export const Government = mongoose.model('Government', governmentSchema);
export default Government;
