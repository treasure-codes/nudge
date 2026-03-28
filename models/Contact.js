import mongoose from 'mongoose'

const ContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    deviceId: { type: String, index: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema)
