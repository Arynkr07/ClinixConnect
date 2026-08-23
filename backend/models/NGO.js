import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    organization: { type: String, required: true },
    workerId: { type: String, index: true },
    designation: { type: String, default: '' },
    region: { type: String, default: '' }, // coverage area / block
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

export const NGO = mongoose.model('NGO', ngoSchema);
export default NGO;
