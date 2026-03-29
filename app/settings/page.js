import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh max-w-[430px] mx-auto">

      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-sm">
        <nav className="flex items-center gap-3 px-8 py-5">
          <Link href="/" className="p-1 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>arrow_back</span>
          </Link>
          <span className="font-black text-xl tracking-tighter text-primary uppercase">Nudge</span>
        </nav>
      </header>

      <main className="pb-20 px-8 pt-6">

        <h1 className="text-[2.5rem] font-black tracking-tighter leading-tight text-primary mb-1">Settings</h1>
        <p className="text-on-surface-variant text-[0.9375rem] mb-10">Manage your account and preferences.</p>

        <div className="space-y-1">
          <Link
            href="/contacts"
            className="flex items-center justify-between gap-4 px-4 py-4 rounded-2xl hover:bg-surface-container active:bg-surface-container transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>contacts</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant mb-0.5">Safety</p>
              <p className="text-[1rem] font-bold tracking-tight">Emergency Contacts</p>
              <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">Who gets alerted if you miss your stop</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors flex-shrink-0">chevron_right</span>
          </Link>
        </div>

      </main>

    </div>
  )
}
