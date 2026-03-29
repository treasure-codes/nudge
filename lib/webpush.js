import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:hello@nudgeapp.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

/**
 * Send a push notification to a subscription object.
 * @param {object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {object} payload - { title, body, url, urgent }
 */
export function sendPush(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}
