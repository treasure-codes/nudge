'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useJourney } from '@/context/JourneyContext'

export default function SetJourneyPage() {
  return (
    <Suspense fallback={<div className="bg-surface-container-lowest min-h-dvh max-w-[430px] mx-auto" />}>
      <SetJourneyContent />
    </Suspense>
  )
}

function SetJourneyContent() {
  const searchParams = useSearchParams()
  const isEnroute    = searchParams.get('enroute') === '1'
  const { startJourney } = useJourney()

  const [mode, setMode]             = useState('Bus')
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [selected, setSelected]     = useState(null)
  const [loadingPlace, setLoadingPlace] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    setResults([])
    if (selected || !query.trim() || query.length < 2) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`/api/places?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.predictions ?? [])
      } catch { setResults([]) }
      finally  { setSearching(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  const handleSelectPlace = useCallback(async (p) => {
    setQuery(p.mainText)
    setResults([])
    setLoadingPlace(true)
    try {
      const res  = await fetch(`/api/places?placeId=${p.placeId}`)
      const data = await res.json()
      setSelected({ id: p.placeId, name: p.mainText, address: p.description,
        lat: data.place?.lat ?? null, lng: data.place?.lng ?? null })
    } catch {
      setSelected({ id: p.placeId, name: p.mainText, address: p.description, lat: null, lng: null })
    } finally { setLoadingPlace(false) }
  }, [])

  const clearSelection = () => { setSelected(null); setQuery(''); setResults([]) }
  const canStart = selected?.lat && !loadingPlace

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <nav className="flex items-center justify-between px-8 pt-10 pb-4 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 active:scale-90 transition-transform rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>arrow_back</span>
          </Link>
          <span className="font-black text-primary text-xl tracking-tighter">Nudge</span>
        </div>
        <Link href="/settings">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>person</span>
        </Link>
      </nav>

      <main className="flex-1 px-8 pt-4 pb-40">

        {/* Headline */}
        <h1 className="text-[2.5rem] font-black tracking-tighter leading-tight mb-6 text-primary">
          {isEnroute ? 'Where are you getting off?' : 'Where to?'}
        </h1>

        {/* Enroute notice */}
        {isEnroute && (
          <div className="flex items-center gap-3 mb-8 px-4 py-3 rounded-2xl bg-surface-container">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>my_location</span>
            <p className="text-[0.8125rem] text-on-surface-variant font-medium">Using your current GPS location as start.</p>
          </div>
        )}

        {/* Mode toggle */}
        {!isEnroute && (
          <div className="flex gap-3 mb-10">
            {['Bus', 'Train'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-[0.75rem] font-bold uppercase tracking-[0.05em] transition-all active:scale-95 ${
                  mode === m ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {m === 'Bus' ? 'directions_bus' : 'train'}
                </span>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="mb-3">
          <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface mb-3">
            Destination
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (selected) clearSelection() }}
              placeholder="Search stop or address…"
              autoComplete="off"
              className="w-full bg-transparent border-0 border-b border-outline-variant py-4 text-[1.5rem] font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/60 placeholder:font-normal placeholder:text-[1.25rem] transition-colors"
            />
            {(searching || loadingPlace) && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm animate-pulse">…</span>
            )}
            {selected && (
              <button onClick={clearSelection} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 active:scale-90">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>close</span>
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {!selected && results.length > 0 && (
          <div className="mt-2 bg-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm">
            {results.map((p, i) => (
              <button
                key={p.placeId}
                onClick={() => handleSelectPlace(p)}
                className={`w-full flex items-start gap-4 py-4 px-5 text-left active:bg-surface-container transition-colors ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}
              >
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }}>location_on</span>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface text-[0.9375rem] truncate">{p.mainText}</p>
                  {p.secondaryText && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{p.secondaryText}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {!selected && query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-[0.8125rem] text-on-surface-variant mt-3">No places found — try a landmark or street name.</p>
        )}

        {/* Selected */}
        {selected && (
          <div className="mt-3 flex items-start gap-4 py-4 px-5 rounded-2xl border border-outline-variant/30 bg-secondary-container/20">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-on-surface text-[0.9375rem] truncate">{selected.name}</p>
              {selected.address && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{selected.address}</p>}
              {!selected.lat && <p className="text-error text-xs mt-1">Could not get coordinates — search again.</p>}
            </div>
          </div>
        )}

        {/* Emergency contacts */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <label className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface">Emergency Contacts</label>
            <Link href="/contacts" className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-secondary">Edit</Link>
          </div>
          <ContactsPreview />
        </section>

      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-8 pb-12 pt-6 bg-white/90 backdrop-blur-xl">
        {!selected && (
          <p className="text-center text-[0.8125rem] text-on-surface-variant mb-4">Choose a destination to continue.</p>
        )}
        <button
          onClick={() => canStart && startJourney(selected)}
          disabled={!canStart}
          className="w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1.0625rem] tracking-tight active:scale-[0.97] transition-all disabled:opacity-25 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        >
          {loadingPlace ? 'Getting location…' : 'Start Journey'}
        </button>
      </div>

    </div>
  )
}

function ContactsPreview() {
  const [contacts, setContacts] = useState([])
  useEffect(() => {
    try { const r = localStorage.getItem('nudge_contacts'); if (r) setContacts(JSON.parse(r)) } catch {}
  }, [])

  if (!contacts.length) {
    return (
      <Link href="/contacts" className="flex items-center gap-4 py-2">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>person_add</span>
        </div>
        <div>
          <p className="text-[0.9375rem] font-medium text-on-surface-variant">Add emergency contact</p>
          <p className="text-xs text-outline mt-0.5">They'll be alerted if you miss your stop</p>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-4">
      {contacts.slice(0, 2).map((c, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-on-surface">{c.name}</p>
            <p className="text-xs text-on-surface-variant">{c.phone}</p>
          </div>
          <div className="ml-auto w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
          </div>
        </div>
      ))}
    </div>
  )
}
