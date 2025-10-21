'use client'

/**
 * Onboarding Tour Component
 *
 * Guides new users through the application with step-by-step instructions
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  MousePointerClick,
  FileText,
  Palette,
  Send,
  Share2,
  CheckCircle2
} from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    href: string
  }
  position?: 'center' | 'top' | 'bottom'
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tramite!',
    description: 'Transform your PDF documents into smart web forms in just 5 steps. Let\'s get you started!',
    icon: <CheckCircle2 className="h-12 w-12 text-primary" />,
    position: 'center'
  },
  {
    id: 'upload',
    title: 'Step 1: Upload Your PDF',
    description: 'Start by uploading a PDF template. This can be any PDF document - application forms, contracts, surveys, or any fillable document.',
    icon: <Upload className="h-12 w-12 text-blue-500" />,
    action: {
      label: 'Upload PDF Template',
      href: '/dashboard/templates'
    }
  },
  {
    id: 'map',
    title: 'Step 2: Map Fields',
    description: 'Click on your PDF to mark where data should appear. Define field types (text, email, date, etc.) and set validation rules.',
    icon: <MousePointerClick className="h-12 w-12 text-green-500" />,
    action: {
      label: 'Try Field Mapping',
      href: '/dashboard/templates'
    }
  },
  {
    id: 'create-form',
    title: 'Step 3: Create Web Form',
    description: 'Generate a beautiful web form from your template. Customize field labels, add help text, and set required fields.',
    icon: <FileText className="h-12 w-12 text-purple-500" />,
    action: {
      label: 'Create Form',
      href: '/dashboard/forms'
    }
  },
  {
    id: 'customize',
    title: 'Step 4: Customize Branding',
    description: 'Make the form yours! Choose colors, fonts, and add your logo. Configure email recipients who will receive submissions.',
    icon: <Palette className="h-12 w-12 text-orange-500" />,
    action: {
      label: 'Customize Forms',
      href: '/dashboard/forms'
    }
  },
  {
    id: 'publish',
    title: 'Step 5: Publish & Share',
    description: 'Publish your form to get a public URL. Share it with anyone - they can fill it out without creating an account. PDFs are generated automatically!',
    icon: <Send className="h-12 w-12 text-pink-500" />,
    action: {
      label: 'Publish Form',
      href: '/dashboard/forms'
    }
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'That\'s it! You can now create unlimited forms, track submissions, and analyze performance. Need help? Check out our documentation.',
    icon: <Share2 className="h-12 w-12 text-green-500" />,
    action: {
      label: 'Go to Dashboard',
      href: '/dashboard'
    },
    position: 'center'
  }
]

interface OnboardingTourProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    if (!hasCompletedOnboarding) {
      setIsVisible(true)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setIsVisible(false)
    onComplete?.()
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setIsVisible(false)
    onSkip?.()
  }

  const handleAction = () => {
    const step = tourSteps[currentStep]
    if (step.action) {
      handleComplete()
      router.push(step.action.href)
    }
  }

  if (!isVisible) return null

  const step = tourSteps[currentStep]
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-2xl ${step.position === 'center' ? 'mx-auto' : ''}`}>
        <CardContent className="pt-6">
          {/* Close Button */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>Step {currentStep + 1} of {tourSteps.length}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step Content */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground text-lg">
              {step.description}
            </p>
          </div>

          {/* Action Button (if available) */}
          {step.action && (
            <div className="mb-6">
              <Button
                onClick={handleAction}
                className="w-full"
                size="lg"
              >
                {step.action.label}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
            >
              Skip Tour
            </Button>

            <Button
              onClick={handleNext}
            >
              {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < tourSteps.length - 1 && (
                <ChevronRight className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-8'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Hook to check if user should see onboarding
 */
export function useOnboarding() {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false)

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    setShouldShowOnboarding(!hasCompletedOnboarding)
  }, [])

  const markAsComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setShouldShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed')
    setShouldShowOnboarding(true)
  }

  return {
    shouldShowOnboarding,
    markAsComplete,
    resetOnboarding
  }
}
