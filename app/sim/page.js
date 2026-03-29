'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Cursor paths per slide ───────────────────────────────────────────────────
// { x, y } relative to phone frame (340 × 700). t = ms from slide start.
// tap: show ripple. typeText: show ghost typing bubble.
const CURSOR_PATHS = [
  // 0: Home — read features, tap "Start a trip"
  [
    { x: 200, y: 360, t: 600 },
    { x: 170, y: 440, t: 1400 },
    { x: 170, y: 490, t: 2200 },
    { x: 170, y: 555, t: 3400 },
    { x: 170, y: 555, t: 4000, tap: true },
  ],
  // 1: Setup — tap search, type destination, tap result, tap start
  [
    { x: 170, y: 200, t: 500 },
    { x: 170, y: 200, t: 900, tap: true, typeText: 'Fisk University' },
    { x: 170, y: 330, t: 3500 },
    { x: 170, y: 330, t: 3900, tap: true },
    { x: 170, y: 630, t: 5800 },
    { x: 170, y: 630, t: 6300, tap: true },
  ],
  // 2: Monitoring — look at ETA, scroll stop list
  [
    { x: 170, y: 160, t: 600 },
    { x: 170, y: 290, t: 1400 },
    { x: 170, y: 230, t: 2400 },
    { x: 170, y: 575, t: 4000 },
    { x: 170, y: 575, t: 4500, tap: true },
  ],
  // 3: Phase 1 alarm — look at message, tap "I'm awake"
  [
    { x: 170, y: 230, t: 400 },
    { x: 170, y: 380, t: 1200 },
    { x: 170, y: 560, t: 2400 },
    { x: 170, y: 560, t: 3000, tap: true },
  ],
  // 4: Arrived — look at stop name, tap code input, type
  [
    { x: 170, y: 300, t: 500 },
    { x: 170, y: 430, t: 1400 },
    { x: 170, y: 490, t: 2000 },
    { x: 170, y: 490, t: 2400, tap: true, typeText: '7421' },
  ],
  // 5: Missed — contact banner, map, route card, safe spots
  [
    { x: 170, y: 200, t: 500 },
    { x: 170, y: 370, t: 1400 },
    { x: 170, y: 440, t: 2200 },
    { x: 170, y: 440, t: 2700, tap: true },
    { x: 230, y: 530, t: 4200 },
    { x: 285, y: 530, t: 5200 },
  ],
  // 6: Safe — read message, tap "I'm safe"
  [
    { x: 170, y: 340, t: 600 },
    { x: 170, y: 430, t: 1500 },
    { x: 170, y: 610, t: 2800 },
    { x: 170, y: 610, t: 3300, tap: true },
  ],
  // 7: Contacts — tap name, type, tap phone, type
  [
    { x: 170, y: 255, t: 500 },
    { x: 170, y: 255, t: 900, tap: true, typeText: 'Treasure' },
    { x: 170, y: 325, t: 2800 },
    { x: 170, y: 325, t: 3200, tap: true, typeText: '+1 615 000 0000' },
    { x: 170, y: 530, t: 5500 },
    { x: 170, y: 530, t: 6000, tap: true },
  ],
]

// ─── Presentation slides ──────────────────────────────────────────────────────
const SLIDES = [
  {
    url: '/',
    duration: 9000,
    caption: '"Ever woken up past your bus stop, lost and panicking? That\'s daily trauma for millions."',
    left: {
      label: 'THE PROBLEM',
      big: '1 in 3',
      sub: 'transit riders have fallen asleep and missed their stop',
    },
    right: {
      heading: 'Why Nudge exists',
      bullets: [
        'Missing a stop causes panic, disorientation & fear',
        'Especially dangerous late at night or in unfamiliar areas',
        'No existing app solves this for bus riders',
        'WeGo Nashville serves 7,800+ riders every weekday',
        'Older adults, shift workers & students most affected',
      ],
    },
    glow: '#006e28',
  },
  {
    url: '/journey/setup',
    duration: 10000,
    caption: 'Plan a route in under 30 seconds — Nudge handles stops, transfers, and alerts automatically.',
    left: {
      label: 'SETUP',
      big: '< 30s',
      sub: 'to plan a route with emergency contacts linked and notified',
    },
    right: {
      heading: 'How it works',
      bullets: [
        'Google Places autocomplete for any destination',
        'WeGo GTFS loads your real stop sequence',
        'Emergency contact linked via one SMS tap',
        'Contact notified the moment your journey starts',
        'Multi-leg journeys with transfers supported',
      ],
    },
    glow: '#006e28',
  },
  {
    url: '/journey/active?demo=monitoring',
    duration: 10000,
    caption: 'Nudge tracks every stop in real time — GPS, ETA, and stop sequence all working while you sleep.',
    left: {
      label: 'LIVE TRACKING',
      big: '45s',
      sub: 'GPS update interval — your contact sees your live position on a map',
    },
    right: {
      heading: 'Monitoring mode',
      bullets: [
        'WeGo GTFS stop sequence ticks off in real time',
        'Google Routes API provides live ETA',
        'Screen stays on via Wake Lock API',
        'Emergency contact watches via live link',
        'Works in the background — phone can be pocketed',
      ],
    },
    glow: '#0ea5e9',
  },
  {
    url: '/journey/active?demo=phase1',
    duration: 9000,
    caption: 'The alarm fires at the stop BEFORE yours — giving you time to press the stop request button.',
    left: {
      label: 'WAKE-UP ALARM',
      big: '1 stop',
      sub: 'before yours — the only moment you need to be awake',
    },
    right: {
      heading: 'Phase 1 alarm',
      bullets: [
        'Web Audio API fire-alarm tone at 960 Hz',
        'Haptic vibration pattern triggers simultaneously',
        'Cannot be snoozed at the penultimate stop',
        'Solves: "drivers rarely wake sleeping riders"',
        'Targets Maria, Jamal & Priya\'s exact moment of risk',
      ],
    },
    glow: '#ef4444',
  },
  {
    url: '/journey/active?demo=arrived',
    duration: 8000,
    caption: 'You made it — confirm you\'re getting off with a quick 4-digit code. Contact notified you\'re safe.',
    left: {
      label: 'SAFE ARRIVAL',
      big: '0',
      sub: 'missed stops in test journeys where the alarm was acknowledged',
    },
    right: {
      heading: 'Arrival confirmation',
      bullets: [
        'CAPTCHA confirms you\'re consciously alighting',
        'Emergency contact gets "arrived safely" push alert',
        'Multi-leg: transitions to transfer countdown',
        'Journey ends, screen lock released',
        'Closes the loop — no more open-ended worry',
      ],
    },
    glow: '#006e28',
  },
  {
    url: '/missed?demo=true',
    duration: 10000,
    caption: 'If the worst happens — Nudge guides you back in under 10 seconds, with safe places to wait.',
    left: {
      label: 'RECOVERY MODE',
      big: '< 10s',
      sub: 'to surface WeGo rerouting options from your exact stop location',
    },
    right: {
      heading: 'Missed stop flow',
      bullets: [
        'Emergency SMS + push sent to contact instantly',
        'WeGo GTFS finds next bus from current stop',
        'Open 24/7 safe spots shown within 200 m',
        'Contact tracks live location until "safe" tapped',
        'Broadcast auto-stops after 15 minutes',
      ],
    },
    glow: '#f59e0b',
  },
  {
    url: '/safe?contact=Treasure',
    duration: 7000,
    caption: 'One tap — your contact is notified you\'re safe and the journey ends cleanly.',
    left: {
      label: 'PEACE OF MIND',
      big: '< 90s',
      sub: 'average time for push notifications to be opened by emergency contacts',
    },
    right: {
      heading: 'The emotional impact',
      bullets: [
        'Ends the "panic, dark walks, reduced alertness" cycle',
        'Restores independence for older adults like Maria',
        'Protects post-shift routine for workers like Jamal',
        'Keeps students like Priya punctual and safe',
        'No app install required for the emergency contact',
      ],
    },
    glow: '#006e28',
  },
  {
    url: '/contacts',
    duration: 9000,
    caption: 'Zero friction — your contact receives one SMS, taps once, and push alerts are enabled forever.',
    left: {
      label: 'CONTACT SETUP',
      big: '1 tap',
      sub: 'is all your emergency contact needs — no app download, no account',
    },
    right: {
      heading: 'Web Push setup',
      bullets: [
        'VAPID Web Push — no app install needed',
        'SMS invite auto-sent directly from the app',
        'Real-time subscription status shown live',
        'Works on iOS Safari + all Android browsers',
        'PWA — riders can install Nudge from their browser',
      ],
    },
    glow: '#006e28',
  },
]

// ─── Cursor hook ──────────────────────────────────────────────────────────────
function useCursorAnimation(slide) {
  const [pos, setPos] = useState({ x: 170, y: 350 })
  const [visible, setVisible] = useState(false)
  const [ripples, setRipples] = useState([])
  const [typeText, setTypeText] = useState('')
  const timeoutsRef = useRef([])

  const clear = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  useEffect(() => {
    clear()
    setVisible(false)
    setTypeText('')
    setRipples([])

    const path = CURSOR_PATHS[slide] ?? []
    if (!path.length) return

    // Show cursor after first step
    const t0 = setTimeout(() => setVisible(true), path[0].t)
    timeoutsRef.current.push(t0)

    path.forEach(step => {
      const tm = setTimeout(() => {
        setPos({ x: step.x, y: step.y })

        if (step.tap) {
          const id = Date.now() + Math.random()
          setRipples(r => [...r, { x: step.x, y: step.y, id }])
          setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 700)
        }

        if (step.typeText) {
          let i = 0
          const chars = step.typeText
          const iv = setInterval(() => {
            i++
            setTypeText(chars.slice(0, i))
            if (i >= chars.length) {
              clearInterval(iv)
              setTimeout(() => setTypeText(''), 1200)
            }
          }, 80)
          timeoutsRef.current.push(iv)
        }
      }, step.t)
      timeoutsRef.current.push(tm)
    })

    return clear
  }, [slide])

  return { pos, visible, ripples, typeText }
}

// ─── Sim page ─────────────────────────────────────────────────────────────────
export default function SimPage() {
  const [slide, setSlide] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const total = SLIDES.length
  const cur = SLIDES[slide]

  const goTo = useCallback((idx) => {
    cancelAnimationFrame(rafRef.current)
    setSlide(idx)
    setProgress(0)
    startRef.current = null
  }, [])

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return }
    const duration = cur.duration
    const tick = (now) => {
      if (!startRef.current) startRef.current = now
      const pct = Math.min(100, ((now - startRef.current) / duration) * 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        const next = slide < total - 1 ? slide + 1 : 0
        setSlide(next)
        setProgress(0)
        startRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [slide, playing, total, cur.duration])

  const { pos, visible, ripples, typeText } = useCursorAnimation(slide)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080d14; font-family: system-ui, -apple-system, sans-serif; overflow-x: hidden; }
        .orb { position: fixed; border-radius: 50%; filter: blur(130px); opacity: 0.10; pointer-events: none; animation: orbf 18s ease-in-out infinite alternate; }
        .orb1 { width: 800px; height: 800px; background: #006e28; top: -300px; left: -250px; }
        .orb2 { width: 700px; height: 700px; background: #1a3a6e; bottom: -250px; right: -200px; animation-delay: -7s; }
        @keyframes orbf { from { transform: translate(0,0); } to { transform: translate(60px, 50px); } }
        @keyframes rippleOut { from { transform: scale(0.2); opacity: 0.7; } to { transform: scale(2.8); opacity: 0; } }
        @keyframes cursorBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes typeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cursor-dot { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.9); box-shadow: 0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.4); transition: left 0.55s cubic-bezier(0.25,0.46,0.45,0.94), top 0.55s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s; pointer-events: none; z-index: 100; position: absolute; transform: translate(-50%, -50%); }
        .ripple { position: absolute; border-radius: 50%; border: 2px solid rgba(255,255,255,0.6); animation: rippleOut 0.65s ease-out forwards; pointer-events: none; z-index: 99; transform: translate(-50%, -50%); }
        .type-bubble { position: absolute; background: rgba(0,0,0,0.85); color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; pointer-events: none; z-index: 101; transform: translate(-50%, -130%); animation: typeIn 0.2s ease; white-space: nowrap; border: 1px solid rgba(255,255,255,0.15); }
        @media (max-width: 860px) { .side-panel { display: none !important; } }
      `}</style>

      <div className="orb orb1" />
      <div className="orb orb2" />

      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', gap: 18 }}>

        {/* Brand header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 5, color: '#006e28', textTransform: 'uppercase', marginBottom: 4 }}>
            NUDGE &nbsp;·&nbsp; LIVE DEMO
          </p>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: -0.5, opacity: 0.9 }}>
            Waking bus riders before their stop.
          </h1>
        </div>

        {/* Stage: left | phone | right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, maxWidth: 1100, width: '100%', justifyContent: 'center' }}>

          {/* LEFT annotation */}
          <div className="side-panel" style={{ flex: '0 0 215px' }}>
            <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '22px 20px', transition: 'all 0.6s ease' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: '#006e28', textTransform: 'uppercase', marginBottom: 12 }}>
                {cur.left.label}
              </p>
              <p style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 8, letterSpacing: -1 }}>
                {cur.left.big}
              </p>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
                {cur.left.sub}
              </p>
            </div>
            <p style={{ marginTop: 10, fontSize: 10, color: '#1e293b', fontWeight: 600, textAlign: 'right', paddingRight: 4 }}>
              {slide + 1} / {total}
            </p>
          </div>

          {/* PHONE */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {/* Ambient glow */}
            <div style={{
              position: 'absolute', inset: -40, borderRadius: 90,
              background: cur.glow, filter: 'blur(70px)',
              opacity: 0.15, transition: 'background 1.2s, opacity 0.6s',
              pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Frame */}
            <div style={{
              position: 'relative', zIndex: 1,
              width: 340, height: 700,
              borderRadius: 54,
              background: '#090909',
              border: '10px solid #1a1a1a',
              boxShadow: '0 0 0 1.5px #282828, 0 50px 110px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}>
              {/* Dynamic island */}
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 112, height: 28, background: '#000', borderRadius: 14, zIndex: 30, pointerEvents: 'none' }} />

              {/* Iframes — all preloaded */}
              {SLIDES.map((s, i) => (
                <iframe
                  key={s.url}
                  src={s.url}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    border: 'none', borderRadius: 44,
                    opacity: i === slide ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                    pointerEvents: 'none',
                  }}
                  title={`slide-${i}`}
                />
              ))}

              {/* Cursor overlay */}
              {visible && (
                <div
                  className="cursor-dot"
                  style={{ left: pos.x, top: pos.y, opacity: visible ? 1 : 0 }}
                />
              )}

              {/* Tap ripples */}
              {ripples.map(r => (
                <div
                  key={r.id}
                  className="ripple"
                  style={{ left: r.x, top: r.y, width: 36, height: 36 }}
                />
              ))}

              {/* Typing bubble */}
              {typeText && (
                <div
                  className="type-bubble"
                  style={{ left: pos.x, top: pos.y }}
                >
                  {typeText}
                  <span style={{ animation: 'cursorBlink 0.8s infinite', marginLeft: 2 }}>|</span>
                </div>
              )}

              {/* Progress bar at bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#111', zIndex: 30, pointerEvents: 'none' }}>
                <div style={{ height: '100%', background: cur.glow, width: `${progress}%`, transition: 'width 0.08s linear' }} />
              </div>

              {/* Home indicator */}
              <div style={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', width: 110, height: 4, borderRadius: 2, background: '#222', zIndex: 30, pointerEvents: 'none' }} />
            </div>

            {/* Side buttons */}
            <div style={{ position: 'absolute', left: -13, top: 130, width: 4, height: 50, background: '#1a1a1a', borderRadius: '2px 0 0 2px' }} />
            <div style={{ position: 'absolute', left: -13, top: 200, width: 4, height: 50, background: '#1a1a1a', borderRadius: '2px 0 0 2px' }} />
            <div style={{ position: 'absolute', right: -13, top: 165, width: 4, height: 78, background: '#1a1a1a', borderRadius: '0 2px 2px 0' }} />
          </div>

          {/* RIGHT annotation */}
          <div className="side-panel" style={{ flex: '0 0 215px' }}>
            <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '22px 20px', transition: 'all 0.6s ease' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: '#006e28', textTransform: 'uppercase', marginBottom: 12 }}>
                {cur.right.heading}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cur.right.bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#006e28', marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#7c8fa8', lineHeight: 1.6, fontWeight: 500 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Caption + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 640, width: '100%' }}>
          <p style={{ fontSize: 13, color: '#475569', fontWeight: 500, textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic', minHeight: 40 }}>
            {cur.caption}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === slide ? 24 : 7, height: 7, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: i === slide ? '#006e28' : i < slide ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.35s',
                padding: 0,
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: '← Prev', act: () => goTo(Math.max(0, slide - 1)), off: slide === 0 },
              { label: playing ? '⏸ Pause' : '▶ Play', act: () => setPlaying(p => !p), off: false },
              { label: 'Next →', act: () => goTo(Math.min(total - 1, slide + 1)), off: slide === total - 1 },
              { label: '↺ Restart', act: () => { goTo(0); setPlaying(true) }, off: false },
            ].map(b => (
              <button key={b.label} onClick={b.act} disabled={b.off} style={{
                padding: '8px 16px', borderRadius: 50,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                color: b.off ? '#1e293b' : '#64748b', fontSize: 12, fontWeight: 700,
                cursor: b.off ? 'not-allowed' : 'pointer', transition: 'color 0.2s',
              }}>
                {b.label}
              </button>
            ))}
            <a href="/" style={{
              padding: '8px 20px', borderRadius: 50, background: '#006e28',
              color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none',
              display: 'flex', alignItems: 'center',
            }}>
              Open App ↗
            </a>
          </div>
        </div>

        <p style={{ fontSize: 9, color: '#131d2b', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
          Nudge · Nashville Transit Safety · PWA
        </p>
      </div>
    </>
  )
}
