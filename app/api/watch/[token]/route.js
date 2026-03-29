const store = global._nudgeWatch ?? (global._nudgeWatch = new Map())

export async function GET(req, { params }) {
  const { token } = await params
  const data = store.get(token)
  if (!data) return Response.json({ status: 'no_journey' })
  // Expire after 30 minutes of no updates
  if (Date.now() - data.updatedAt > 30 * 60 * 1000) {
    store.delete(token)
    return Response.json({ status: 'no_journey' })
  }
  return Response.json({ status: 'active', ...data })
}
