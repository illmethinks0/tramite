'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export function Header({ user }: { user: User }) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-background-secondary px-6 lg:px-9 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-h4 font-semibold text-foreground">
          Welcome back!
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-body-sm text-foreground-muted">
          {user.email}
        </span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
