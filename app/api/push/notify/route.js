import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import PushSubscription from '@/models/PushSubscription'
import { sendPush } from '@/lib/webpush'

/**
 * POST /api/push/notify
 * Body: { token, type, userName, stopName, watchUrl }
 * Types: 'watch' | 'missed' | 'safe'
 */
export async function POST(req) {
  const { token, type, userName, stopName, watchUrl } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  await connectDB()
  const record = await PushSubscription.findOne({ token }).lean()
  if (!record) return NextResponse.json({ error: 'no subscription found' }, { status: 404 })

  let payload
  if (type === 'watch') {
    payload = {
      title: `🚌 ${userName} started a journey`,
      body: `Heading to ${stopName ?? 'their stop'}. You'll be notified if something goes wrong.`,
      url: watchUrl ?? '/',
      urgent: false,
    }
  } else if (type === 'missed') {
    payload = {
      title: `🚨 ${userName} missed their stop!`,
      body: `${userName} missed ${stopName ?? 'their stop'} and may need help. Tap to track.`,
      url: watchUrl ?? '/',
      urgent: true,
    }
  } else if (type === 'safe') {
    payload = {
      title: `✅ ${userName} arrived safely`,
      body: `${userName} has safely reached ${stopName ?? 'their stop'}. All clear.`,
      url: watchUrl ?? '/',
      urgent: false,
    }
  } else {
    return NextResponse.json({ error: 'unknown type' }, { status: 400 })
  }

  try {
    await sendPush(record.subscription, payload)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Push notify]', err)
    // If subscription is expired/invalid (410 Gone), clean it up
    if (err.statusCode === 410) {
      await PushSubscription.deleteOne({ token })
    }
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 })
  }
}
