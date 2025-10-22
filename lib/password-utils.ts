export type PasswordStrength = 'weak' | 'medium' | 'strong'

export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) return 'weak'

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Complexity checks
  if (/[a-z]/.test(password)) score++ // lowercase
  if (/[A-Z]/.test(password)) score++ // uppercase
  if (/[0-9]/.test(password)) score++ // numbers
  if (/[^A-Za-z0-9]/.test(password)) score++ // special chars

  // Determine strength
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'strong':
      return 'bg-green-500'
  }
}

export function getPasswordStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'Weak password'
    case 'medium':
      return 'Medium strength'
    case 'strong':
      return 'Strong password'
  }
}
