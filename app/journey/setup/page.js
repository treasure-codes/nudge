'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useJourney } from '@/context/JourneyContext'

export default function SetJourneyPage() {
  return (
    <Suspense fallback={<div className="bg-surface-container-lowest min-h-dvh max-w-[430px] mx-auto" />}>
      <SetJourneyContent />
    </Suspense>
  )
}

function SetJourneyContent() {
  const { startJourney } = useJourney()

  const [legs, setLegs] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingPlace, setLoadingPlace] = useState(false)
  const [isAddingStop, setIsAddingStop] = useState(true)
  const debounceRef = useRef(null)

  // Debounced autocomplete
  useEffect(() => {
    setResults([])
    if (!isAddingStop || !query.trim() || query.length < 2) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.predictions ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, isAddingStop])

  const handleSelectPlace = useCallback(async (p) => {
    setQuery('')
    setResults([])
    setLoadingPlace(true)
    try {
      const res = await fetch(`/api/places?placeId=${p.placeId}`)
      const data = await res.json()
      setLegs(prev => [...prev, {
        id: p.placeId,
        name: p.mainText,
        address: p.description,
        lat: data.place?.lat ?? null,
        lng: data.place?.lng ?? null,
      }])
    } catch {
      setLegs(prev => [...prev, {
        id: p.placeId,
        name: p.mainText,
        address: p.description,
        lat: null,
        lng: null,
      }])
    }
    setIsAddingStop(false)
    setLoadingPlace(false)
  }, [])

  const removeLeg = (idx) => {
    setLegs(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length === 0) setIsAddingStop(true)
      return next
    })
  }

  const cancelAdding = () => {
    setIsAddingStop(false)
    setQuery('')
    setResults([])
  }

  const canStart = legs.length > 0 && legs.every(l => l.lat) && !loadingPlace && !isAddingStop

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

        <h1 className="text-[2.5rem] font-black tracking-tighter leading-tight mb-1 text-primary">
          Plan your route
        </h1>
        <p className="text-on-surface-variant text-[0.9375rem] mb-8 leading-relaxed">
          Add every stop where you need to get off.
        </p>

        {/* Route rail */}
        <div className="relative">

          {/* Origin node */}
          <div className="flex items-center gap-4 mb-0">
            <div className="w-8 flex flex-col items-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
              {(legs.length > 0 || isAddingStop) && (
                <div className="w-0.5 h-5 bg-outline-variant/40 mt-0.5" />
              )}
            </div>
            <span className="text-[0.8125rem] font-bold text-secondary uppercase tracking-widest pb-1">
              Your location
            </span>
          </div>

          {/* Confirmed legs */}
          {legs.map((leg, i) => {
            const isLastLeg = i === legs.length - 1
            const showConnector = !isLastLeg || isAddingStop
            return (
              <div key={`${leg.id}-${i}`} className="flex items-stretch gap-4">

                {/* Rail */}
                <div className="w-8 flex flex-col items-center flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                    isLastLeg && !isAddingStop ? 'bg-primary border-primary' : 'bg-white border-primary'
                  }`}>
                    {(!isLastLeg || isAddingStop) ? (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>
                        transfer_within_a_station
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>
                        flag
                      </span>
                    )}
                  </div>
                  {showConnector && (
                    <div className="w-0.5 flex-1 min-h-[44px] bg-outline-variant/40" />
                  )}
                </div>

                {/* Stop card */}
                <div className="flex-1 py-2 pb-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">
                        {isLastLeg && !isAddingStop ? 'Final stop' : `Transfer stop ${i + 1}`}
                      </p>
                      <p className="font-bold text-on-surface text-[0.9375rem] truncate">{leg.name}</p>
                      {!leg.lat && (
                        <p className="text-error text-xs mt-0.5">No coordinates — remove and try again</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeLeg(i)}
                      className="p-1.5 active:scale-90 flex-shrink-0 hover:bg-surface-container-high rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  </div>
                </div>

              </div>
            )
          })}

          {/* Live search row */}
          {isAddingStop && (
            <div className="flex items-start gap-4">
              <div className="w-8 flex flex-col items-center flex-shrink-0 pt-4">
                <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-white flex-shrink-0 ring-4 ring-primary/10 animate-pulse" />
              </div>
              <div className="flex-1 pb-2">
                <label className="block text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  {legs.length === 0 ? 'First stop' : 'Next stop'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search stop or address…"
                    autoComplete="off"
                    autoFocus
                    className="w-full bg-transparent border-0 border-b-2 border-primary py-3 text-[1.125rem] font-bold focus:outline-none placeholder:text-outline-variant/60 placeholder:font-normal placeholder:text-[1rem] transition-colors"
                  />
                  {(searching || loadingPlace) && (
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-primary text-sm animate-pulse">…</span>
                  )}
                  {legs.length > 0 && (
                    <button onClick={cancelAdding} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 active:scale-90">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>close</span>
                    </button>
                  )}
                </div>

                {/* Autocomplete results */}
                {results.length > 0 && (
                  <div className="mt-2 bg-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md relative z-10">
                    {results.map((p, ri) => (
                      <button
                        key={p.placeId}
                        onClick={() => handleSelectPlace(p)}
                        className={`w-full flex items-start gap-4 py-4 px-5 text-left active:bg-surface-container transition-colors ${ri > 0 ? 'border-t border-outline-variant/20' : ''}`}
                      >
                        <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }}>location_on</span>
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface text-[0.9375rem] truncate">{p.mainText}</p>
                          {p.secondaryText && (
                            <p className="text-xs text-on-surface-variant mt-0.5 truncate">{p.secondaryText}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="text-[0.8125rem] text-on-surface-variant mt-3">
                    No places found — try a landmark or street name.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add another stop button */}
          {legs.length > 0 && !isAddingStop && (
            <div className="flex items-center gap-4 mt-1">
              <div className="w-8 flex justify-center flex-shrink-0">
                <div className="w-0.5 h-4 bg-outline-variant/40" />
              </div>
              <button
                onClick={() => setIsAddingStop(true)}
                className="flex-1 flex items-center gap-3 py-3 px-4 rounded-2xl border border-dashed border-outline-variant text-on-surface-variant active:bg-surface-container transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '14px' }}>add</span>
                </div>
                <span className="text-[0.875rem] font-bold">Add transfer stop</span>
              </button>
            </div>
          )}

        </div>

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
        {legs.length === 0 && (
          <p className="text-center text-[0.8125rem] text-on-surface-variant mb-4">
            Search and add your stops above.
          </p>
        )}
        <button
          onClick={() => canStart && startJourney(legs[0], legs.slice(1))}
          disabled={!canStart}
          className="w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1.0625rem] tracking-tight active:scale-[0.97] transition-all disabled:opacity-25 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        >
          {loadingPlace
            ? 'Getting location…'
            : legs.length > 1
            ? `Start ${legs.length}-stop Journey`
            : 'Start Journey'}
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
