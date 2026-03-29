import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import PushSubscription from '@/models/PushSubscription'

/**
 * GET /api/push/status?token=xxx
 * Returns { subscribed: true } once the contact has clicked Allow.
 */
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  await connectDB()
  const sub = await PushSubscription.findOne({ token }).lean()
  return NextResponse.json({ subscribed: !!sub })
}
