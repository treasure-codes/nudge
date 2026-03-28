'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useJourney } from '@/context/JourneyContext'

// ─── Main page wrapper (Suspense required for useSearchParams) ────────────────
export default function SetJourneyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SetJourneyContent />
    </Suspense>
  )
}

function SetJourneyContent() {
  const searchParams = useSearchParams()
  const isEnroute = searchParams.get('enroute') === '1'
  const { startJourney } = useJourney()

  const [mode, setMode] = useState('Bus')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loadingPlace, setLoadingPlace] = useState(false)
  const debounceRef = useRef(null)

  // Debounced Google Places search
  useEffect(() => {
    setResults([])
    if (selected) return
    if (!query.trim() || query.length < 2) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.predictions ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  const handleSelectPlace = useCallback(async (prediction) => {
    setQuery(prediction.mainText)
    setResults([])
    setLoadingPlace(true)
    try {
      const res = await fetch(`/api/places?placeId=${prediction.placeId}`)
      const data = await res.json()
      if (data.place) {
        setSelected({
          id: prediction.placeId,
          name: prediction.mainText,
          address: prediction.description,
          lat: data.place.lat,
          lng: data.place.lng,
          routes: [],
        })
      }
    } catch {
      // Place details failed — still set with just the name
      setSelected({
        id: prediction.placeId,
        name: prediction.mainText,
        address: prediction.description,
        lat: null,
        lng: null,
        routes: [],
      })
    } finally {
      setLoadingPlace(false)
    }
  }, [])

  const handleStart = () => {
    if (!selected || !selected.lat) return
    startJourney(selected)
  }

  const clearSelection = () => {
    setSelected(null)
    setQuery('')
    setResults([])
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-outline-variant/10 flex items-center justify-between px-6 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex p-2 -ml-2 rounded-full hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-black">arrow_back</span>
          </Link>
          <span className="font-black text-black text-lg tracking-tight">
            {isEnroute ? 'Quick Monitor' : 'Set Journey'}
          </span>
        </div>
        <Link href="/settings" className="p-2 -mr-2 inline-flex">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '22px' }}>
            person
          </span>
        </Link>
      </nav>

      <main className="flex-1 px-6 pt-8 pb-36 w-full">
        {/* Headline */}
        <h1 className="text-[2.75rem] font-black tracking-tighter leading-none mb-10 text-primary">
          {isEnroute ? "Where are you\ngetting off?" : "Where to?"}
        </h1>

        {/* Enroute GPS notice */}
        {isEnroute && (
          <div className="flex items-center gap-3 mb-8 px-4 py-3 bg-secondary-container/30 rounded-xl">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
            >
              my_location
            </span>
            <p className="text-sm font-medium text-on-surface-variant">
              Using your current GPS location as starting point.
            </p>
          </div>
        )}

        {/* Mode Toggle (hide in enroute mode) */}
        {!isEnroute && (
          <div className="flex gap-3 mb-10">
            {['Bus', 'Train'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-2.5 rounded-full text-[0.75rem] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                  mode === m
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="mb-3">
          <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Destination stop or area
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (selected) clearSelection() }}
              placeholder="e.g. Vanderbilt, Riverfront Station…"
              autoComplete="off"
              className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 pb-3 pt-1 text-xl font-bold focus:outline-none focus:border-primary placeholder:text-outline-variant/40 placeholder:font-normal placeholder:text-base transition-colors pr-8"
            />
            {(searching || loadingPlace) && (
              <span className="absolute right-0 bottom-3 text-on-surface-variant text-xs animate-pulse">
                ...
              </span>
            )}
          </div>
        </div>

        {/* Search Results */}
        {!selected && results.length > 0 && (
          <div className="mb-10 rounded-xl overflow-hidden border border-outline-variant/15 shadow-sm">
            {results.map((p, i) => (
              <button
                key={p.placeId}
                onClick={() => handleSelectPlace(p)}
                className={`w-full flex items-start gap-4 py-4 px-5 hover:bg-surface-container-low active:bg-surface-container transition-colors text-left ${
                  i > 0 ? 'border-t border-outline-variant/10' : ''
                }`}
              >
                <span
                  className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5"
                  style={{ fontSize: '19px' }}
                >
                  location_on
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-[0.95rem] truncate">{p.mainText}</p>
                  {p.secondaryText && (
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{p.secondaryText}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!selected && query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-sm text-on-surface-variant py-3 mb-8">
            No places found — try a street name or landmark.
          </p>
        )}

        {/* Selected Stop */}
        {selected && (
          <div className="mb-10 mt-4">
            <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Confirmed destination
            </label>
            <div className="flex items-start justify-between gap-4 p-4 bg-surface-container-low rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-on-secondary-container"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight leading-tight">{selected.name}</h3>
                  {selected.address && (
                    <p className="text-on-surface-variant text-xs mt-1 leading-snug">{selected.address}</p>
                  )}
                  {!selected.lat && (
                    <p className="text-error text-xs mt-1">Could not get coordinates — please search again.</p>
                  )}
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-full hover:bg-surface-container transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '17px' }}>
                  close
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-on-surface-variant">
              Emergency Contacts
            </label>
            <Link
              href="/contacts"
              className="text-[0.7rem] font-bold uppercase tracking-widest text-secondary"
            >
              Edit
            </Link>
          </div>
          <ContactsPreview />
        </section>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-10 pt-4 bg-white/95 backdrop-blur-xl border-t border-outline-variant/10">
        <button
          onClick={handleStart}
          disabled={!selected || !selected.lat}
          className="w-full h-14 bg-primary text-white rounded-full font-bold text-base tracking-tight active:scale-[0.98] transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        >
          {loadingPlace ? 'Getting location…' : 'Start Monitoring'}
        </button>
      </div>
    </div>
  )
}

function ContactsPreview() {
  const [contacts, setContacts] = useState([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nudge_contacts')
      if (raw) setContacts(JSON.parse(raw))
    } catch {}
  }, [])

  if (contacts.length === 0) {
    return (
      <Link href="/contacts" className="flex items-center gap-4 py-3 group">
        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '17px' }}>
            person_add
          </span>
        </div>
        <div>
          <p className="font-semibold text-on-surface-variant text-sm">Add emergency contact</p>
          <p className="text-xs text-outline mt-0.5">They will be alerted if you miss your stop</p>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-4">
      {contacts.slice(0, 2).map((c, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-on-secondary-container"
              style={{ fontSize: '17px' }}
            >
              person
            </span>
          </div>
          <div>
            <p className="font-bold text-sm leading-none">{c.name}</p>
            <p className="text-on-surface-variant text-xs mt-1">{c.phone}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
