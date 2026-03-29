import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import PushSubscription from '@/models/PushSubscription'

/**
 * POST /api/push/subscribe
 * Body: { token, subscription: { endpoint, keys: { p256dh, auth } } }
 */
export async function POST(req) {
  const { token, subscription } = await req.json()
  if (!token || !subscription?.endpoint) {
    return NextResponse.json({ error: 'token and subscription required' }, { status: 400 })
  }

  await connectDB()
  await PushSubscription.findOneAndUpdate(
    { token },
    { token, subscription, subscribedAt: new Date() },
    { upsert: true, new: true }
  )

  return NextResponse.json({ ok: true })
}
