import { Infobip, AuthType } from '@infobip-api/sdk'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { phone, userName, stopName, lat, lng, type, watchUrl } = await req.json()

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Clean phone (Infobip expects E.164 format, e.g., +12345678901)
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '')

    // ── Demo mode: no SMS provider configured ──────────────────────────
    if (!process.env.INFOBIP_API_KEY) {
      console.log(`[Demo SMS] → ${cleanPhone} | type=${type ?? 'emergency'}`)
      return NextResponse.json({ success: true, demo: true })
    }

    let message
    if (type === 'watch') {
      message = `${userName || 'Your friend'} has started a journey with Nudge and added you as their emergency contact. Watch their live location here: ${watchUrl}`
    } else if (type === 'safe') {
      message = `✅ ${userName || 'Your friend'} has safely arrived${stopName ? ` at ${stopName}` : ' at their destination'}. All clear — no action needed.`
    } else if (type === 'invite') {
      message = `${userName || 'Someone'} uses Nudge to stay safe on the bus and added you as their emergency contact. If they miss their stop, you'll get an alert — one tap to set up, no app needed: ${watchUrl}`
    } else {
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
      message = `URGENT: ${userName} missed their stop${stopName ? ` at ${stopName}` : ''}. Their current location: ${mapsLink}${watchUrl ? ` — Live tracking: ${watchUrl}` : ''}`
    }

    // Ensure baseUrl has https:// (Infobip dashboard often provides it without)
    let baseUrl = process.env.INFOBIP_BASE_URL || ''
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`
    }

    const client = new Infobip({
      baseUrl: baseUrl,
      apiKey: process.env.INFOBIP_API_KEY,
      authType: AuthType.ApiKey,
    })

    const response = await client.channels.sms.send({
      type: 'text',
      messages: [
        {
          destinations: [{ to: cleanPhone }],
          from: 'Nudge',
          text: message,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      messageId: response.data?.messages?.[0]?.messageId,
    })
  } catch (error) {
    console.error('❌ Infobip SMS Error:', {
      message: error.message,
      status: error.statusCode || error.status,
      response: error.response?.data || error.response,
    })
    return NextResponse.json(
      { error: error.response?.data?.requestError?.serviceException?.text || error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
