'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      toast.error('Failed to send reset email', {
        description: error.message
      })
      setLoading(false)
    } else {
      setSent(true)
      toast.success('Check your email', 'We sent you a password reset link')
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-h1 font-semibold text-foreground mb-2">
              Check your email
            </h1>
            <p className="text-body text-foreground-muted">
              We&apos;ve sent password reset instructions to
            </p>
            <p className="text-body text-foreground font-medium mt-1">
              {email}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background-secondary p-6">
            <p className="text-body-sm text-foreground-muted mb-4">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="w-full"
              >
                Try a different email
              </Button>

              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-accent hover:text-accent-hover"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-h1 font-semibold text-foreground mb-2">
            Reset password
          </h1>
          <p className="text-body text-foreground-muted">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-secondary p-8">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-body-sm text-foreground-muted">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-accent hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
