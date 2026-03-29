const store = global._nudgeWatch ?? (global._nudgeWatch = new Map())

export async function POST(req) {
  try {
    const body = await req.json()
    const { token, ...data } = body
    if (!token) return Response.json({ error: 'missing token' }, { status: 400 })
    store.set(token, { ...data, updatedAt: Date.now() })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 })
  }
}
