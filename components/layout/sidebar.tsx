'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/templates', label: 'Templates', icon: '📄' },
  { href: '/dashboard/generate', label: 'Generate PDFs', icon: '✨' },
  { href: '/dashboard/team', label: 'Team', icon: '👥' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-background-secondary hidden lg:block">
      <div className="p-6">
        <Link href="/dashboard" className="text-h3 font-semibold text-foreground">
          PDF Autofill
        </Link>
      </div>

      <nav className="px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-foreground-muted hover:bg-background hover:text-foreground'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
