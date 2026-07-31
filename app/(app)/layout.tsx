import { UserButton, SignOutButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import NavLinks from './NavLinks'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-52 flex flex-col flex-shrink-0 bg-card" style={{ borderRight: '1px solid rgba(201,146,42,0.15)' }}>
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(201,146,42,0.15)' }}>
          <span className="font-serif text-base tracking-[0.12em] text-foreground select-none">
            RIVER <em className="not-italic text-gold">X</em>
          </span>
        </div>
        <NavLinks />
        <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(201,146,42,0.15)' }}>
          <div className="flex items-center gap-3 px-1 py-1">
            <UserButton afterSignOutUrl="/" />
            <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground">Account</span>
          </div>
          <SignOutButton redirectUrl="/">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <LogOut size={12} />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background p-8">
        {children}
      </main>
    </div>
  )
}
