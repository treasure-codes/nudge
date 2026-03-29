import Link from 'next/link'

const items = [
  { category: 'Safety',      label: 'Emergency Contacts', href: '/contacts', icon: 'contacts' },
  { category: 'Audio',       label: 'Alarm Sound',        href: null,         icon: 'volume_up' },
  { category: 'Permissions', label: 'Privacy & Location', href: null,         icon: 'location_on' },
]

export default function SettingsPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh max-w-[430px] mx-auto">

      {/* Header */}
      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-white/80 backdrop-blur-xl">
        <nav className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1 active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>arrow_back</span>
            </Link>
            <span className="font-black text-xl tracking-tighter text-primary uppercase">Nudge</span>
          </div>
        </nav>
      </header>

      <main className="pt-28 pb-32 px-8">

        {/* Hero profile */}
        <section className="mb-14">
          <div className="w-24 h-24 rounded-full overflow-hidden mb-8 bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 0, 'wght' 200" }}>person</span>
          </div>
          <h1 className="text-[2rem] font-black tracking-tight mb-2 leading-none uppercase">Your Settings</h1>
          <p className="text-on-surface-variant font-medium text-[1.0625rem]">Manage your personal preferences</p>
        </section>

        {/* Settings list */}
        <div className="flex flex-col space-y-10 mb-16">
          {items.map((item) => (
            item.href ? (
              <Link key={item.label} href={item.href}
                className="flex items-center justify-between group text-left w-full active:scale-95 transition-transform duration-200">
                <div className="flex flex-col">
                  <span className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant mb-1">{item.category}</span>
                  <span className="text-[1.25rem] font-bold tracking-tight">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
            ) : (
              <div key={item.label}
                className="flex items-center justify-between text-left w-full opacity-30">
                <div className="flex flex-col">
                  <span className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant mb-1">{item.category}</span>
                  <span className="text-[1.25rem] font-bold tracking-tight">{item.label}</span>
                </div>
                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1 rounded-full bg-surface-container">Soon</span>
              </div>
            )
          ))}

          {/* Sign out */}
          <Link href="/"
            className="flex items-center justify-between group text-left w-full active:scale-95 transition-transform duration-200 pt-10 mt-4 border-t border-outline-variant/30">
            <div className="flex flex-col">
              <span className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Account</span>
              <span className="text-[1.25rem] font-bold tracking-tight">Sign Out</span>
            </div>
            <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">logout</span>
          </Link>
        </div>


      </main>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center px-4 py-4">
          <Link href="/" className="flex flex-col items-center p-3 text-on-surface-variant hover:text-primary transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>home_max</span>
          </Link>
          <Link href="/journey/setup" className="flex flex-col items-center p-3 text-on-surface-variant hover:text-primary transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>directions_bus</span>
          </Link>
          <Link href="/contacts" className="flex flex-col items-center p-3 text-on-surface-variant hover:text-primary transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>security</span>
          </Link>
          <div className="flex flex-col items-center bg-primary text-white rounded-full p-3 scale-110 active:scale-90 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
        </div>
      </nav>

    </div>
  )
}
