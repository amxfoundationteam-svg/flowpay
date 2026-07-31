'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, Send, Download, FileText, ArrowUpRight } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/send', label: 'Send', icon: Send },
  { href: '/receive', label: 'Receive', icon: Download },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payouts', label: 'Payouts', icon: ArrowUpRight },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-3 mx-2 px-3 py-2.5 text-[10px] tracking-[0.14em] uppercase transition-colors ${
              active
                ? 'text-gold bg-gold/8'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            style={active ? { borderLeft: '2px solid #C9922A', paddingLeft: 'calc(0.75rem - 2px)' } : {}}>
            <Icon size={13} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
