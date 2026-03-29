'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const EMPTY = { name: '', phone: '', pushToken: null }

function makeToken(senderName) {
  const rand = Math.random().toString(36).slice(2, 10)
  const encoded = senderName?.trim() ? encodeURIComponent(senderName.trim()) : ''
  return encoded ? `${rand}_${encoded}` : rand
}

export default function ContactsPage() {
  const [userName, setUserName]     = useState('')
  const [contacts, setContacts]     = useState([{ ...EMPTY }, { ...EMPTY }])
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Per-contact push link state: null | { token, url, status: 'pending'|'subscribed' }
  const [pushLink, setPushLink] = useState([null, null])
  const pollRefs = useRef([null, null])

  useEffect(() => {
    try {
      const n = localStorage.getItem('nudge_username')
      if (n) setUserName(n)
      const r = localStorage.getItem('nudge_contacts')
      if (r) {
        const p = JSON.parse(r)
        setContacts([
          { ...EMPTY, ...(p[0] ?? {}) },
          { ...EMPTY, ...(p[1] ?? {}) },
        ])
      }
    } catch {}
    return () => pollRefs.current.forEach(id => id && clearInterval(id))
  }, [])

  const persist = (updated, name) => {
    const filtered = updated.filter(c => c.name.trim() && c.phone.trim())
    localStorage.setItem('nudge_username', name ?? userName)
    localStorage.setItem('nudge_contacts', JSON.stringify(filtered))
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    persist(contacts, userName)
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contacts.filter(c => c.name.trim() && c.phone.trim()) }),
      })
    } catch {}
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const handleTestSMS = async () => {
    const c = contacts.find(c => c.name.trim() && c.phone.trim())
    if (!c) { setTestResult({ ok: false, msg: 'Add a contact first.' }); return }
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: c.phone, userName: userName || 'User', stopName: 'Test Stop', lat: 36.1627, lng: -86.7816 }),
      })
      const data = await res.json()
      setTestResult({ ok: res.ok, msg: res.ok ? `Test SMS sent to ${c.name}.` : data.error || 'Failed.' })
    } catch { setTestResult({ ok: false, msg: 'Network error.' }) }
    setTesting(false)
  }

  const generatePushLink = async (idx) => {
    const token = makeToken(userName)  // encode the rider's name, not the contact's
    const url = `${window.location.origin}/subscribe/${token}`
    const contact = contacts[idx]

    setPushLink(prev => {
      const next = [...prev]
      next[idx] = { token, url, status: 'sending' }
      return next
    })

    // Try to SMS the link — fall back gracefully if it fails
    let smsSent = false
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contact.phone,
          userName: userName || 'Your contact',
          type: 'invite',
          watchUrl: url,
        }),
      })
      smsSent = res.ok
    } catch {}

    setPushLink(prev => {
      const next = [...prev]
      next[idx] = { token, url, status: smsSent ? 'pending' : 'manual' }
      return next
    })

    // Poll for subscription
    if (pollRefs.current[idx]) clearInterval(pollRefs.current[idx])
    pollRefs.current[idx] = setInterval(async () => {
      try {
        const res = await fetch(`/api/push/status?token=${token}`)
        const { subscribed } = await res.json()
        if (subscribed) {
          clearInterval(pollRefs.current[idx])
          pollRefs.current[idx] = null
          setContacts(prev => {
            const next = prev.map((ct, i) => i === idx ? { ...ct, pushToken: token } : ct)
            persist(next, userName)
            return next
          })
          setPushLink(prev => {
            const next = [...prev]
            next[idx] = { token, url, status: 'subscribed' }
            return next
          })
        }
      } catch {}
    }, 3000)
  }

  const disconnectPush = (idx) => {
    if (pollRefs.current[idx]) clearInterval(pollRefs.current[idx])
    setPushLink(prev => { const next = [...prev]; next[idx] = null; return next })
    setContacts(prev => {
      const next = prev.map((ct, i) => i === idx ? { ...ct, pushToken: null } : ct)
      persist(next, userName)
      return next
    })
  }

  const update = (idx, field, val) =>
    setContacts(p => p.map((c, i) => i === idx ? { ...c, [field]: val } : c))

  const filled = contacts.filter(c => c.name.trim() && c.phone.trim())

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-white/80 backdrop-blur-xl">
        <nav className="flex items-center gap-3 px-8 py-5">
          <Link href="/settings" className="p-1 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>arrow_back</span>
          </Link>
          <span className="font-black text-xl tracking-tighter text-primary uppercase">Nudge</span>
        </nav>
      </header>

      <main className="flex-1 pt-28 px-8 pb-40">

        <h1 className="text-[2.5rem] font-black tracking-tighter leading-tight text-primary mb-3">
          Who should we call?
        </h1>
        <p className="text-on-surface-variant text-[1.0625rem] leading-relaxed mb-10">
          We only reach out if you miss your stop and don't respond.
        </p>

        {/* Your name */}
        <section className="mb-10">
          <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface mb-3">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="e.g. Maria"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-3 text-[1.25rem] font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/50 placeholder:font-normal transition-colors"
          />
        </section>

        {/* Contacts */}
        {contacts.map((c, idx) => {
          const pl = pushLink[idx]
          const isSubscribed = c.pushToken && (!pl || pl.status === 'subscribed')
          const isSending    = pl?.status === 'sending'
          const isPending    = pl?.status === 'pending' || isSending
          const isManual     = pl?.status === 'manual'

          return (
            <section key={idx} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-primary' : 'bg-surface-container-high'}`}>
                  <span className={`text-[0.625rem] font-black ${idx === 0 ? 'text-white' : 'text-on-surface-variant'}`}>{idx + 1}</span>
                </div>
                <label className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface">
                  {idx === 0 ? 'Primary Contact' : 'Backup Contact'}
                </label>
                {c.name.trim() && c.phone.trim() && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Name</label>
                  <input
                    type="text"
                    value={c.name}
                    onChange={e => update(idx, 'name', e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-transparent border-0 border-b border-outline-variant py-2.5 text-[1.125rem] font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/50 placeholder:font-normal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Phone</label>
                  <input
                    type="tel"
                    value={c.phone}
                    onChange={e => update(idx, 'phone', e.target.value)}
                    placeholder="+1 615 000 0000"
                    className="w-full bg-transparent border-0 border-b border-outline-variant py-2.5 text-[1.125rem] font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/50 placeholder:font-normal transition-colors"
                  />
                </div>

                {/* Push notification section */}
                {c.name.trim() && c.phone.trim() && (
                  <div className="pt-1">
                    {isSubscribed ? (
                      /* Connected state */
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>
                              notifications_active
                            </span>
                          </div>
                          <span className="text-[0.8125rem] font-bold text-secondary">Push alerts enabled</span>
                        </div>
                        <button
                          onClick={() => disconnectPush(idx)}
                          className="text-[0.75rem] text-on-surface-variant underline active:opacity-60"
                        >
                          Remove
                        </button>
                      </div>

                    ) : isManual ? (
                      /* SMS failed — show link to share manually */
                      <div className="space-y-3">
                        <p className="text-[0.8125rem] text-on-surface-variant">
                          Couldn't send SMS automatically. Share this link with {c.name.trim()}:
                        </p>
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container">
                          <span className="text-[0.8125rem] text-on-surface font-medium flex-1 truncate">{pl.url}</span>
                          <button
                            onClick={() => navigator.clipboard?.writeText(pl.url)}
                            className="flex-shrink-0 text-primary active:scale-90 transition-transform"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof navigator !== 'undefined' && navigator.share && (
                            <button
                              onClick={() => navigator.share({ title: 'Nudge alert setup', text: `${userName || 'Your contact'} wants to send you safety alerts — one tap to enable:`, url: pl.url })}
                              className="h-9 px-4 rounded-full bg-primary text-white text-[0.8125rem] font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>share</span>
                              Share link
                            </button>
                          )}
                          <button
                            onClick={() => disconnectPush(idx)}
                            className="text-[0.75rem] text-on-surface-variant underline active:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[0.75rem] text-on-surface-variant/60">
                          They open it once, tap "Enable notifications" — done. No app needed.
                        </p>
                      </div>

                    ) : isPending ? (
                      /* SMS sent — waiting for contact to tap */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 border-primary flex-shrink-0 ${isSending ? 'border-t-transparent animate-spin' : 'border-transparent bg-primary'}`}>
                            {!isSending && <span className="material-symbols-outlined text-white" style={{ fontSize: '10px', fontVariationSettings: "'FILL' 1" }}>check</span>}
                          </div>
                          <span className="text-[0.8125rem] text-on-surface-variant">
                            {isSending
                              ? `Sending link to ${c.name.trim()}…`
                              : `Link sent to ${c.name.trim()} via SMS — waiting for them to tap it`}
                          </span>
                        </div>
                        {!isSending && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => navigator.clipboard?.writeText(pl.url)}
                              className="text-[0.75rem] text-primary font-bold flex items-center gap-1 active:opacity-60"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                              Copy link
                            </button>
                            {typeof navigator !== 'undefined' && navigator.share && (
                              <button
                                onClick={() => navigator.share({ title: 'Nudge alert setup', url: pl.url })}
                                className="text-[0.75rem] text-primary font-bold flex items-center gap-1 active:opacity-60"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>share</span>
                                Share another way
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    ) : (
                      /* Not connected */
                      <button
                        onClick={() => generatePushLink(idx)}
                        className="flex items-center gap-2 text-[0.8125rem] font-bold text-primary active:opacity-60 transition-opacity"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>
                            add_alert
                          </span>
                        </div>
                        Send {c.name.trim()} a notification link
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )
        })}

        {/* SMS preview */}
        <section className="mt-4 mb-6">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface mb-4">SMS they'll receive</p>
          <div className="px-5 py-4 rounded-2xl bg-surface-container">
            <p className="text-[0.875rem] text-on-surface-variant leading-relaxed">
              <span className="text-error font-bold">URGENT:</span>{' '}
              <span className="text-on-surface font-medium">{userName || 'User'}</span> missed their stop at [Stop Name].
              Their location: <span className="text-secondary font-medium">maps.google.com/...</span>
            </p>
          </div>
        </section>

        {/* Test result */}
        {testResult && (
          <div className={`px-5 py-4 rounded-2xl flex items-center gap-3 mb-4 ${testResult.ok ? 'bg-secondary-container/30' : 'bg-error-container/30'}`}>
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", color: testResult.ok ? '#006e28' : '#ba1a1a' }}>
              {testResult.ok ? 'check_circle' : 'error'}
            </span>
            <p className={`text-[0.875rem] font-medium ${testResult.ok ? 'text-secondary' : 'text-error'}`}>{testResult.msg}</p>
          </div>
        )}

      </main>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-8 pb-12 pt-4 space-y-3 bg-white/90 backdrop-blur-xl">
        <button
          onClick={handleTestSMS}
          disabled={testing || !filled.length}
          className="w-full h-12 rounded-full text-[0.875rem] font-bold text-secondary flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 bg-secondary-container/30"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>send</span>
          {testing ? 'Sending…' : 'Send Test SMS'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[56px] rounded-full font-bold text-[1.0625rem] text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40 bg-primary shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        >
          {saved
            ? <><span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved</>
            : saving ? 'Saving…' : 'Save Contacts'}
        </button>
      </div>

    </div>
  )
}
