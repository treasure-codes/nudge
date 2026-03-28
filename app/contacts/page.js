'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ContactsPage() {
  const [userName, setUserName] = useState('')
  const [contacts, setContacts] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('nudge_username')
      if (savedName) setUserName(savedName)
      const raw = localStorage.getItem('nudge_contacts')
      if (raw) {
        const parsed = JSON.parse(raw)
        setContacts([
          parsed[0] ?? { name: '', phone: '' },
          parsed[1] ?? { name: '', phone: '' },
        ])
      }
    } catch {}
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const filtered = contacts.filter((c) => c.name.trim() && c.phone.trim())

    localStorage.setItem('nudge_username', userName)
    localStorage.setItem('nudge_contacts', JSON.stringify(filtered))

    // Sync to MongoDB
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: filtered }),
      })
    } catch (e) {
      console.warn('MongoDB sync failed, using localStorage only')
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTestSMS = async () => {
    const c = contacts.find((c) => c.name.trim() && c.phone.trim())
    if (!c) {
      setTestResult({ ok: false, msg: 'Add a contact with name and phone first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: c.phone,
          userName: userName || 'User',
          stopName: 'Test Stop (Nashville)',
          lat: 36.1627,
          lng: -86.7816,
        }),
      })
      const data = await res.json()
      setTestResult({
        ok: res.ok,
        msg: res.ok
          ? `Test SMS sent to ${c.name}!`
          : data.error || 'Failed to send.',
      })
    } catch (e) {
      setTestResult({ ok: false, msg: 'Network error. Check your connection.' })
    }
    setTesting(false)
  }

  const updateContact = (idx, field, value) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  return (
    <div className="min-h-screen bg-white text-on-surface flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
        <nav className="flex items-center gap-4 px-8 py-6">
          <Link
            href="/settings"
            className="inline-flex p-2 hover:bg-surface-container-low transition-colors rounded-full active:scale-95"
          >
            <span className="material-symbols-outlined text-black">arrow_back</span>
          </Link>
          <span className="font-black text-2xl tracking-tighter text-black uppercase">Nudge</span>
        </nav>
      </header>

      <main className="flex-1 px-8 pt-8 pb-36 max-w-lg mx-auto w-full">
        <h1 className="text-[2.5rem] font-black tracking-tighter leading-none mb-2 text-primary">
          Emergency<br />Contacts
        </h1>
        <p className="text-on-surface-variant text-base mb-16 leading-relaxed">
          These people will receive an SMS if you miss your stop.
        </p>

        {/* Your Name */}
        <section className="mb-14">
          <label className="block text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Maria"
            className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 text-xl font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/40 transition-colors"
          />
          <p className="text-xs text-on-surface-variant mt-2">
            Used in the alert SMS: &ldquo;{userName || 'User'} missed their stop&hellip;&rdquo;
          </p>
        </section>

        {/* Contacts */}
        {contacts.map((contact, idx) => (
          <section key={idx} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="text-xs font-black text-on-surface-variant">{idx + 1}</span>
              </div>
              <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
                {idx === 0 ? 'Primary Contact' : 'Backup Contact'}
              </label>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 text-lg font-semibold focus:outline-none focus:border-primary placeholder:text-outline-variant/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  placeholder="+1 615 000 0000"
                  className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 text-lg font-semibold focus:outline-none focus:border-primary placeholder:text-outline-variant/40 transition-colors"
                />
              </div>
            </div>
          </section>
        ))}

        {/* SMS Preview */}
        <div className="bg-surface-container-low rounded-xl p-6 mb-14">
          <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            SMS Preview
          </p>
          <p className="text-sm text-on-surface leading-relaxed">
            <strong>URGENT:</strong> {userName || 'User'} missed their stop at [Stop Name]. Their current location:{' '}
            https://maps.google.com/?q=36.1627,-86.7816
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`p-4 rounded-xl mb-6 ${
              testResult.ok ? 'bg-secondary-container' : 'bg-error-container'
            }`}
          >
            <p
              className={`text-sm font-bold ${
                testResult.ok ? 'text-on-secondary-container' : 'text-on-error-container'
              }`}
            >
              {testResult.msg}
            </p>
          </div>
        )}
      </main>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 w-full px-8 pb-12 pt-4 bg-white/90 backdrop-blur-xl space-y-3">
        <button
          onClick={handleTestSMS}
          disabled={testing}
          className="w-full h-12 rounded-full border border-primary text-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {testing ? 'Sending\u2026' : 'Send Test SMS'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              Saved
            </>
          ) : saving ? (
            'Saving\u2026'
          ) : (
            'Save Contacts'
          )}
        </button>
      </div>
    </div>
  )
}
