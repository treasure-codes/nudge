import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Contact from '@/models/Contact'

export async function GET(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId') || 'default'
    const contacts = await Contact.find({ deviceId })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
    return NextResponse.json({ contacts })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await connectDB()
    const { contacts, deviceId = 'default' } = await req.json()

    // Replace all contacts for this device
    await Contact.deleteMany({ deviceId })

    const created = await Contact.insertMany(
      contacts.map((c, i) => ({
        ...c,
        deviceId,
        isPrimary: i === 0,
      }))
    )

    return NextResponse.json({ success: true, contacts: created })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    await connectDB()
    const { deviceId = 'default' } = await req.json()
    await Contact.deleteMany({ deviceId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
