'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export default function SubscribePage() {
  const { token } = useParams()
  const [status, setStatus] = useState('idle') // idle | requesting | success | denied | error | unsupported
  const [senderName, setSenderName] = useState(null)

  // Try to decode sender name from token suffix (optional, best-effort)
  useEffect(() => {
    // token format: randomPart_encodedName (optional)
    try {
      const parts = token.split('_')
      if (parts.length > 1) {
        setSenderName(decodeURIComponent(parts[parts.length - 1]))
      }
    } catch {}
  }, [token])

  const handleEnable = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    setStatus('requesting')
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Save to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, subscription }),
      })

      if (!res.ok) throw new Error('Server error')
      setStatus('success')
    } catch (err) {
      console.error('Subscribe error:', err)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-dvh bg-surface-container-lowest flex flex-col items-center justify-center px-8 max-w-[430px] mx-auto">

      {status === 'success' ? (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>
              notifications_active
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] font-black tracking-tighter text-primary mb-2">You're connected!</h1>
            <p className="text-on-surface-variant text-[1rem] leading-relaxed">
              You'll get an alert if {senderName ?? 'your contact'} misses their stop or needs help.
            </p>
          </div>
          <p className="text-[0.8125rem] text-on-surface-variant/60">
            You can close this tab. Notifications will arrive even when your browser is in the background.
          </p>
        </div>

      ) : status === 'denied' ? (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>
              notifications_off
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] font-black tracking-tighter text-primary mb-2">Notifications blocked</h1>
            <p className="text-on-surface-variant text-[1rem] leading-relaxed">
              To enable alerts, open your browser settings and allow notifications for this site, then reload.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="h-12 px-8 rounded-full font-bold text-[0.9375rem] text-white bg-primary active:scale-95 transition-transform"
          >
            Try again
          </button>
        </div>

      ) : status === 'unsupported' ? (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '40px' }}>
              browser_not_supported
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] font-black tracking-tighter text-primary mb-2">Browser not supported</h1>
            <p className="text-on-surface-variant text-[1rem] leading-relaxed">
              Please open this link in Chrome, Firefox, or Safari (iOS 16.4+) to enable notifications.
            </p>
          </div>
        </div>

      ) : status === 'error' ? (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>
              error
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] font-black tracking-tighter text-primary mb-2">Something went wrong</h1>
            <p className="text-on-surface-variant text-[1rem] leading-relaxed">
              We couldn't set up notifications. Please try again.
            </p>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="h-12 px-8 rounded-full font-bold text-[0.9375rem] text-white bg-primary active:scale-95 transition-transform"
          >
            Try again
          </button>
        </div>

      ) : (
        <div className="text-center space-y-8">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>
              notifications
            </span>
          </div>

          <div>
            <div className="text-[0.875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Nudge</div>
            <h1 className="text-[2.25rem] font-black tracking-tighter text-primary leading-tight mb-4">
              {senderName ? `${senderName} wants to\nsend you alerts` : 'Enable safety alerts'}
            </h1>
            <p className="text-on-surface-variant text-[1rem] leading-relaxed">
              You'll only be notified if {senderName ?? 'your contact'} misses their bus stop and doesn't respond.
              No spam — just emergencies.
            </p>
          </div>

          <div className="space-y-3 w-full">
            <button
              onClick={handleEnable}
              disabled={status === 'requesting'}
              className="w-full h-[56px] rounded-full font-bold text-[1.0625rem] text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-60 bg-primary shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
            >
              {status === 'requesting' ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Enabling…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                    notifications_active
                  </span>
                  Enable notifications
                </>
              )}
            </button>
            <p className="text-[0.75rem] text-on-surface-variant/60">
              One tap. No account needed. Works in the background.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
