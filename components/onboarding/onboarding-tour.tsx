'use client'

/**
 * Onboarding Tour Component - Contextual Tooltips
 *
 * Non-blocking tour using floating tooltips positioned near UI elements
 * Users can interact with the dashboard while tour is active
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FocusScope } from '@radix-ui/react-focus-scope'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronRight,
  Upload,
  MousePointerClick,
  FileText,
  Palette,
  Send,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  // Target element selector for positioning the tooltip
  target?: string
  // Position relative to target
  position?: 'top' | 'bottom' | 'left' | 'right'
  // Spotlight effect (highlights target element)
  spotlight?: boolean
}

const tourSteps: TourStep[] = [
  {
    id: 'templates-card',
    title: 'Start with a PDF Template',
    description: 'Upload any PDF document - forms, contracts, surveys. Click here to get started.',
    icon: <Upload className="h-5 w-5 text-blue-500" />,
    target: '[data-tour="templates-card"]',
    position: 'right',
    spotlight: true
  },
  {
    id: 'forms-card',
    title: 'Create Web Forms',
    description: 'Once you upload a PDF, create beautiful web forms from it. Map fields, customize branding, and publish.',
    icon: <FileText className="h-5 w-5 text-purple-500" />,
    target: '[data-tour="forms-card"]',
    position: 'right',
    spotlight: true
  },
  {
    id: 'submissions-card',
    title: 'Track Submissions',
    description: 'View all form responses in one place. Each submission automatically generates a filled PDF.',
    icon: <Send className="h-5 w-5 text-green-500" />,
    target: '[data-tour="submissions-card"]',
    position: 'left',
    spotlight: true
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'That\'s the basics! Explore the dashboard and create your first form. Need help? Check our documentation.',
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    position: 'bottom'
  }
]

interface TooltipPosition {
  top: number
  left: number
  arrowPosition: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingTourProps {
  isActive: boolean
  onComplete?: () => void
  onDismiss?: () => void
}

export function OnboardingTour({ isActive, onComplete, onDismiss }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus management - store and restore focus
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement
      tooltipRef.current?.focus()
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) return

    const updatePosition = () => {
      const step = tourSteps[currentStep]
      if (!step.target) {
        // Center position for steps without a target
        setTooltipPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          arrowPosition: 'top'
        })
        return
      }

      const targetElement = document.querySelector(step.target)
      if (!targetElement) {
        console.warn(`Tour target not found: ${step.target}`)
        return
      }

      const targetRect = targetElement.getBoundingClientRect()
      const tooltipWidth = 400
      const tooltipHeight = 200
      const gap = 20

      let top = 0
      let left = 0
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'left'

      switch (step.position) {
        case 'right':
          top = targetRect.top + targetRect.height / 2
          left = targetRect.right + gap
          arrowPosition = 'left'
          break
        case 'left':
          top = targetRect.top + targetRect.height / 2
          left = targetRect.left - tooltipWidth - gap
          arrowPosition = 'right'
          break
        case 'top':
          top = targetRect.top - tooltipHeight - gap
          left = targetRect.left + targetRect.width / 2
          arrowPosition = 'bottom'
          break
        case 'bottom':
          top = targetRect.bottom + gap
          left = targetRect.left + targetRect.width / 2
          arrowPosition = 'top'
          break
        default:
          top = targetRect.top + targetRect.height / 2
          left = targetRect.right + gap
          arrowPosition = 'left'
      }

      // Keep tooltip in viewport
      if (left + tooltipWidth > window.innerWidth - 20) {
        left = window.innerWidth - tooltipWidth - 20
      }
      if (left < 20) {
        left = 20
      }
      if (top + tooltipHeight > window.innerHeight - 20) {
        top = window.innerHeight - tooltipHeight - 20
      }
      if (top < 20) {
        top = 20
      }

      setTooltipPosition({ top, left, arrowPosition })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, isActive])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_step', '0')
    onComplete?.()
  }

  const handleDismiss = () => {
    // Save current step so user can resume later
    localStorage.setItem('onboarding_step', currentStep.toString())
    onDismiss?.()
  }

  if (!isActive || !mounted) return null

  const step = tourSteps[currentStep]
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  // Render spotlight overlay for highlighted elements
  const renderSpotlight = () => {
    if (!step.spotlight || !step.target) return null

    const targetElement = document.querySelector(step.target)
    if (!targetElement) return null

    const rect = targetElement.getBoundingClientRect()

    return createPortal(
      <div
        className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
        style={{
          background: `
            radial-gradient(
              circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
              transparent ${Math.max(rect.width, rect.height) / 2 + 20}px,
              rgba(0, 0, 0, 0.4) ${Math.max(rect.width, rect.height) / 2 + 120}px
            )
          `
        }}
      />,
      document.body
    )
  }

  // Render the tooltip
  const tooltip = tooltipPosition && (
    <FocusScope trapped={isActive} loop>
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className={cn(
          "fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-300",
          step.position === 'right' && "slide-in-from-left-2",
          step.position === 'left' && "slide-in-from-right-2",
          step.position === 'top' && "slide-in-from-bottom-2",
          step.position === 'bottom' && "slide-in-from-top-2"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.target
            ? `translate(${tooltipPosition.arrowPosition === 'left' ? '0' : tooltipPosition.arrowPosition === 'right' ? '-100%' : '-50%'}, ${tooltipPosition.arrowPosition === 'top' ? '0' : tooltipPosition.arrowPosition === 'bottom' ? '-100%' : '-50%'})`
            : 'translate(-50%, -50%)',
          maxWidth: '400px',
          width: '90vw'
        }}
      >
      <Card className="relative shadow-2xl border-primary/50">
        <CardContent className="p-6">
          {/* Arrow pointer */}
          {step.target && (
            <div
              className={cn(
                "absolute w-4 h-4 bg-card border rotate-45",
                tooltipPosition.arrowPosition === 'left' && "-left-2 top-1/2 -translate-y-1/2 border-r-0 border-b-0 border-primary/50",
                tooltipPosition.arrowPosition === 'right' && "-right-2 top-1/2 -translate-y-1/2 border-l-0 border-t-0 border-primary/50",
                tooltipPosition.arrowPosition === 'top' && "-top-2 left-1/2 -translate-x-1/2 border-b-0 border-r-0 border-primary/50",
                tooltipPosition.arrowPosition === 'bottom' && "-bottom-2 left-1/2 -translate-x-1/2 border-t-0 border-l-0 border-primary/50"
              )}
            />
          )}

          {/* Close button */}
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>{currentStep + 1} of {tourSteps.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <div className="flex items-start gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-2">
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
            >
              Skip Tour
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                size="sm"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </FocusScope>
  )

  return (
    <>
      {renderSpotlight()}
      {mounted && createPortal(tooltip, document.body)}
    </>
  )
}

/**
 * Tour Trigger Button
 * Add this to the dashboard to allow users to start the tour
 */
export function TourTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      Show me around
    </Button>
  )
}

/**
 * Hook to manage onboarding state
 */
export function useOnboarding() {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    const hasSeenTour = localStorage.getItem('onboarding_seen')

    // Auto-show for first-time users (can be disabled if too aggressive)
    if (!hasCompletedOnboarding && !hasSeenTour) {
      setShouldShowOnboarding(true)
      // Mark as seen so we don't auto-show again
      localStorage.setItem('onboarding_seen', 'true')
    }
  }, [])

  const startTour = () => {
    // Wait for dashboard to load before starting tour
    const checkReady = setInterval(() => {
      if (document.querySelector('[data-tour="templates-card"]')) {
        clearInterval(checkReady)
        setIsTourActive(true)
        setShouldShowOnboarding(false)
      }
    }, 100)

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkReady), 5000)
  }

  const markAsComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setIsTourActive(false)
    setShouldShowOnboarding(false)
  }

  const dismissTour = () => {
    setIsTourActive(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('onboarding_seen')
    localStorage.removeItem('onboarding_step')
    setShouldShowOnboarding(true)
  }

  return {
    shouldShowOnboarding,
    isTourActive,
    startTour,
    markAsComplete,
    dismissTour,
    resetOnboarding
  }
}
