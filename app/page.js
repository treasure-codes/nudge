import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-5 w-full">
          <span className="text-sm font-black tracking-[0.2em] uppercase text-black">NUDGE</span>
          <Link href="/settings">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '22px' }}>
              person
            </span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col px-6 pt-14 pb-10">
        {/* Hero */}
        <section className="mb-14">
          <h1 className="text-[3.75rem] leading-[1.0] font-black tracking-tighter text-black mb-6">
            Sleep on<br />your commute.
          </h1>
          <p className="text-[1.1rem] text-on-surface-variant leading-relaxed">
            Nudge wakes you before your stop and alerts your family if you miss it.
          </p>
        </section>

        {/* Features */}
        <section className="mb-auto">
          <div className="space-y-5">
            {[
              { icon: 'alarm', label: 'Escalating alarm as you approach your stop' },
              { icon: 'sms', label: 'Emergency SMS to your contacts if you miss it' },
              { icon: 'location_on', label: 'Live location shared with people who care' },
              { icon: 'offline_bolt', label: 'Works in the background while you sleep' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-on-secondary-container"
                    style={{ fontSize: '17px', fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className="text-[0.975rem] font-medium text-on-surface leading-snug pt-1.5">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="my-12 h-px bg-outline-variant/20" />

        {/* CTAs */}
        <footer className="space-y-3">
          <Link
            href="/journey/setup"
            className="flex items-center justify-center w-full h-14 rounded-full bg-black text-white font-bold text-base tracking-tight hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            Start Monitoring
          </Link>
          <Link
            href="/journey/setup?enroute=1"
            className="flex items-center justify-center gap-2 w-full h-14 rounded-full border border-black/15 bg-surface-container-low text-on-surface font-semibold text-base hover:border-black/30 active:scale-[0.98] transition-all duration-150"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              directions_bus
            </span>
            I&apos;m already on a bus
          </Link>
          <p className="text-center pt-2">
            <Link href="/contacts" className="text-[11px] uppercase tracking-[0.15em] font-semibold text-outline hover:text-black transition-colors">
              Set up emergency contacts
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
