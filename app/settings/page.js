import Link from 'next/link'

const settingsItems = [
  { category: 'Safety', label: 'Emergency Contacts', href: '/contacts' },
  { category: 'Audio', label: 'Alarm Sound', href: null },
  { category: 'Permissions', label: 'Privacy & Location', href: null },
]

export default function SettingsPage() {
  return (
    <div className="font-body antialiased min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl">
        <nav className="flex items-center justify-between px-8 py-6 max-w-full mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="material-symbols-outlined text-black active:scale-95 transition-transform duration-200 cursor-pointer"
            >
              arrow_back
            </Link>
            <span className="font-black text-2xl tracking-tighter text-black uppercase">Nudge</span>
          </div>
        </nav>
      </header>

      <main className="pt-32 pb-32 px-8 max-w-2xl mx-auto">
        {/* Profile */}
        <section className="mb-16">
          <div className="w-24 h-24 rounded-full overflow-hidden mb-8 bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
          </div>
          <h1 className="text-[2rem] font-black tracking-tight mb-2 leading-none uppercase">Your Settings</h1>
          <p className="text-on-surface-variant font-medium text-lg">Manage your personal preferences</p>
        </section>

        {/* Settings List */}
        <div className="flex flex-col space-y-12">
          {settingsItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between group text-left w-full active:scale-95 transition-transform duration-200"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                    {item.category}
                  </span>
                  <span className="text-xl font-bold tracking-tight">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-black group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </Link>
            ) : (
              <button
                key={item.label}
                className="flex items-center justify-between group text-left w-full active:scale-95 transition-transform duration-200 opacity-40 cursor-not-allowed"
                disabled
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                    {item.category}
                  </span>
                  <span className="text-xl font-bold tracking-tight">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-black">chevron_right</span>
              </button>
            )
          )}

          {/* Sign Out */}
          <Link
            href="/"
            className="flex items-center justify-between group text-left w-full active:scale-95 transition-transform duration-200 mt-12 pt-12 border-t border-outline-variant/20"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">Account</span>
              <span className="text-xl font-bold tracking-tight">Sign Out</span>
            </div>
            <span className="material-symbols-outlined text-black">logout</span>
          </Link>
        </div>

        {/* Pro Upsell */}
        <section className="mt-24">
          <div className="bg-primary text-white p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-video relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-3xl font-black tracking-tighter uppercase mb-4 leading-tight">
                Pro<br />Security
              </h2>
              <p className="text-on-primary-fixed-variant text-lg max-w-xs">
                Unlock 24/7 monitoring and advanced alerts for your peace of mind.
              </p>
            </div>
            <button className="z-10 mt-8 bg-white text-black px-8 py-4 rounded-full font-bold self-start active:scale-95 transition-transform">
              Upgrade Now
            </button>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-secondary-container rounded-full blur-[80px] opacity-20" />
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-white/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex justify-around items-center px-6 py-4 w-full">
          <Link
            href="/"
            className="flex flex-col items-center justify-center text-neutral-400 p-4 hover:text-black transition-colors active:scale-90 duration-300"
          >
            <span className="material-symbols-outlined">home</span>
          </Link>
          <Link
            href="/journey/setup"
            className="flex flex-col items-center justify-center text-neutral-400 p-4 hover:text-black transition-colors active:scale-90 duration-300"
          >
            <span className="material-symbols-outlined">directions_bus</span>
          </Link>
          <Link
            href="/contacts"
            className="flex flex-col items-center justify-center text-neutral-400 p-4 hover:text-black transition-colors active:scale-90 duration-300"
          >
            <span className="material-symbols-outlined">notifications</span>
          </Link>
          <div className="flex flex-col items-center justify-center bg-black text-white rounded-full p-4 scale-110 active:scale-90 duration-300 cursor-pointer">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
        </div>
      </nav>
    </div>
  )
}
