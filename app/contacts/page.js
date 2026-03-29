'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ContactsPage() {
  const [userName, setUserName] = useState('')
  const [contacts, setContacts] = useState([{ name: '', phone: '' }, { name: '', phone: '' }])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    try {
      const n = localStorage.getItem('nudge_username')
      if (n) setUserName(n)
      const r = localStorage.getItem('nudge_contacts')
      if (r) { const p = JSON.parse(r); setContacts([p[0] ?? { name:'', phone:'' }, p[1] ?? { name:'', phone:'' }]) }
    } catch {}
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    const filtered = contacts.filter(c => c.name.trim() && c.phone.trim())
    localStorage.setItem('nudge_username', userName)
    localStorage.setItem('nudge_contacts', JSON.stringify(filtered))
    try { await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: filtered }) }) } catch {}
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const handleTestSMS = async () => {
    const c = contacts.find(c => c.name.trim() && c.phone.trim())
    if (!c) { setTestResult({ ok: false, msg: 'Add a contact first.' }); return }
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: c.phone, userName: userName || 'User', stopName: 'Test Stop', lat: 36.1627, lng: -86.7816 }) })
      const data = await res.json()
      setTestResult({ ok: res.ok, msg: res.ok ? `Test SMS sent to ${c.name}.` : data.error || 'Failed.' })
    } catch { setTestResult({ ok: false, msg: 'Network error.' }) }
    setTesting(false)
  }

  const update = (idx, field, val) => setContacts(p => p.map((c, i) => i === idx ? { ...c, [field]: val } : c))
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
        {contacts.map((c, idx) => (
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
            </div>
          </section>
        ))}

        {/* SMS preview */}
        <section className="mt-4 mb-6">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface mb-4">Message they'll receive</p>
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
