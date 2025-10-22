'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { checkPasswordStrength, getPasswordStrengthColor } from '@/lib/password-utils'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setPasswordStrength(checkPasswordStrength(value))
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Validate password strength
    if (passwordStrength === 'weak') {
      toast.error('Please use a stronger password', {
        description: 'Use 8+ characters with letters, numbers, and symbols'
      })
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      toast.error('Failed to reset password', {
        description: error.message
      })
      setLoading(false)
    } else {
      toast.success('Password updated successfully!')
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-semibold text-foreground mb-2">
            Set new password
          </h1>
          <p className="text-body text-foreground-muted">
            Choose a strong password for your account
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-secondary p-8">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                  minLength={8}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        level === 1 && getPasswordStrengthColor(passwordStrength),
                        level === 2 && (passwordStrength === 'medium' || passwordStrength === 'strong') && getPasswordStrengthColor(passwordStrength),
                        level === 3 && passwordStrength === 'strong' && getPasswordStrengthColor(passwordStrength),
                        !(
                          (level === 1) ||
                          (level === 2 && (passwordStrength === 'medium' || passwordStrength === 'strong')) ||
                          (level === 3 && passwordStrength === 'strong')
                        ) && "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  ))}
                </div>
              )}

              <p className="mt-1 text-caption text-foreground-subtle">
                Use 8+ characters with letters, numbers, and symbols
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "pr-10",
                    confirmPassword && password !== confirmPassword && 'border-red-500'
                  )}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-caption text-red-500">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
