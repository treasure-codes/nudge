import { Infobip, AuthType } from '@infobip-api/sdk'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { phone, userName, stopName, lat, lng, type, watchUrl } = await req.json()

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    let message
    if (type === 'watch') {
      message = `${userName} has started a journey with Nudge and added you as their emergency contact. Watch their live location here: ${watchUrl}`
    } else {
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
      message = `URGENT: ${userName} missed their stop at ${stopName}. Their current location: ${mapsLink}${watchUrl ? ` — Live tracking: ${watchUrl}` : ''}`
    }

    const client = new Infobip({
      baseUrl: process.env.INFOBIP_BASE_URL,
      apiKey: process.env.INFOBIP_API_KEY,
      authType: AuthType.ApiKey,
    })

    const response = await client.channels.sms.send({
      messages: [
        {
          destinations: [{ to: phone }],
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
    console.error('SMS error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
