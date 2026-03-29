import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface h-dvh flex flex-col max-w-[430px] mx-auto overflow-hidden">

      {/* Header */}
      <header className="flex justify-between items-center px-8 pt-12 pb-3 flex-shrink-0">
        <span className="text-lg font-black tracking-tighter text-primary">Nudge</span>
        <Link href="/settings">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>person</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-8 pb-8 justify-between min-h-0">

        {/* Hero */}
        <section className="pt-2">
          <h1 className="text-[2.25rem] leading-[1.08] font-black tracking-tighter text-primary mb-2">
            Sleep on your<br />commute.
          </h1>
          <p className="text-[0.9375rem] text-on-surface-variant leading-relaxed">
            We'll make sure you get off at the right stop.
          </p>
        </section>

        {/* Feature list */}
        <section className="space-y-3 pb-2">
          {[
            'Wake you before your stop',
            'Get you home if you miss it',
            'Alert someone who cares',
            'Works offline',
          ].map((text) => (
            <div key={text} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container"
                  style={{ fontSize: '15px', fontVariationSettings: "'wght' 700, 'FILL' 1" }}>
                  check
                </span>
              </div>
              <span className="text-[0.9375rem] font-medium text-on-surface">{text}</span>
            </div>
          ))}
        </section>

        {/* Photo */}
        <div className="overflow-hidden rounded-xl bg-surface-container w-full flex-shrink-0 mb-2" style={{ height: '180px' }}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHCQIN3Bt1iuzFl8Tn2hdRmX9LFTErCj7Uxq47aCvsiTSMraOzlhHf1OmN-7OZQVvjb1JVe0fVtjXOgGIeqE5EHta8Dae4T9vWBe6A3XuvoMFOW3BLePSshBVqb4T_eqBFLsfkHBiFm6XbT2quv5OYnh-NuQWuQjeKOq4-T0AHmUv76YYrmlAtuxgyVP9orPwCIvBNTkFrT-amPEeEdWPljKYEXaXaCjGcbsq1tOLDMTAOMWr9VPcHc9CIhc9QSXZQotFcyvANkCfn"
            alt="Commuter sleeping on train"
            className="w-full h-full object-cover grayscale opacity-80"
          />
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/journey/setup"
            className="flex items-center justify-center w-full h-[54px] rounded-full bg-primary text-white font-bold text-[1rem] tracking-tight active:scale-[0.97] transition-all duration-150"
          >
            Get Started
          </Link>
          <Link
            href="/journey/setup?enroute=1"
            className="block text-center text-[0.75rem] uppercase tracking-widest font-semibold text-on-surface-variant py-1.5"
          >
            Already on a bus? Start monitoring
          </Link>
        </div>

      </main>

    </div>
  )
}
