import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  token:        { type: String, required: true, unique: true },
  subscription: { type: Object, required: true }, // { endpoint, keys: { p256dh, auth } }
  subscribedAt: { type: Date, default: Date.now },
})

export default mongoose.models.PushSubscription
  || mongoose.model('PushSubscription', schema)
