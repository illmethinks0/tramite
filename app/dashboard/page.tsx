'use client'

/**
 * Dashboard Home Page
 *
 * Main dashboard landing page with overview and quick actions
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OnboardingTour, TourTriggerButton, useOnboarding } from '@/components/onboarding/onboarding-tour'
import {
  Upload,
  FileText,
  Send,
  BarChart3,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { shouldShowOnboarding, isTourActive, startTour, markAsComplete, dismissTour } = useOnboarding()
  const [stats, setStats] = useState({
    templates: 0,
    forms: 0,
    submissions: 0,
    recentForms: [] as any[]
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setIsLoading(true)
    try {
      // Load templates count
      const templatesRes = await fetch('/api/templates')
      const templatesData = await templatesRes.ok ? await templatesRes.json() : { templates: [] }

      // Load forms count and recent forms
      const formsRes = await fetch('/api/forms')
      const formsData = await formsRes.ok ? await formsRes.json() : { forms: [] }

      // Load submissions count
      const submissionsRes = await fetch('/api/submissions/list?limit=1')
      const submissionsData = await submissionsRes.ok ? await submissionsRes.json() : { total: 0 }

      setStats({
        templates: templatesData.templates?.length || 0,
        forms: formsData.forms?.length || 0,
        submissions: submissionsData.total || 0,
        recentForms: formsData.forms?.slice(0, 5) || []
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasContent = stats.templates > 0 || stats.forms > 0

  return (
    <>
      {/* Onboarding Tour */}
      <OnboardingTour
        isActive={isTourActive}
        onComplete={markAsComplete}
        onDismiss={dismissTour}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here&apos;s your overview.
            </p>
          </div>
          {(shouldShowOnboarding || (typeof window !== 'undefined' && !localStorage.getItem('onboarding_completed'))) && (
            <TourTriggerButton onClick={startTour} />
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Templates</p>
                  <p className="text-3xl font-bold">{stats.templates}</p>
                </div>
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Forms</p>
                  <p className="text-3xl font-bold">{stats.forms}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Submissions</p>
                  <p className="text-3xl font-bold">{stats.submissions}</p>
                </div>
                <Send className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Analytics</p>
                  <Button
                    onClick={() => router.push('/dashboard/analytics')}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    View Stats
                  </Button>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {!hasContent && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Create your first form in just 3 steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push('/dashboard/templates')}
                  className="h-auto py-6 flex flex-col gap-2"
                  variant="outline"
                >
                  <Upload className="h-8 w-8" />
                  <span className="font-semibold">1. Upload PDF</span>
                  <span className="text-xs text-muted-foreground">
                    Upload your PDF template
                  </span>
                </Button>

                <Button
                  onClick={() => router.push('/dashboard/templates')}
                  className="h-auto py-6 flex flex-col gap-2"
                  variant="outline"
                  disabled={stats.templates === 0}
                >
                  <FileText className="h-8 w-8" />
                  <span className="font-semibold">2. Map Fields</span>
                  <span className="text-xs text-muted-foreground">
                    Click to mark fillable areas
                  </span>
                </Button>

                <Button
                  onClick={() => router.push('/dashboard/forms')}
                  className="h-auto py-6 flex flex-col gap-2"
                  variant="outline"
                  disabled={stats.templates === 0}
                >
                  <Send className="h-8 w-8" />
                  <span className="font-semibold">3. Publish Form</span>
                  <span className="text-xs text-muted-foreground">
                    Share your form publicly
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Forms */}
        {stats.recentForms.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Forms</CardTitle>
                  <CardDescription>Your latest created forms</CardDescription>
                </div>
                <Button
                  onClick={() => router.push('/dashboard/forms')}
                  variant="outline"
                  size="sm"
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentForms.map((form: any) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{form.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {form.submission_count || 0} submissions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.is_published ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Published
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Draft</span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            data-tour="templates-card"
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/templates')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>Manage PDF templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Upload Template
              </Button>
            </CardContent>
          </Card>

          <Card
            data-tour="forms-card"
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/forms')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Forms</CardTitle>
                  <CardDescription>Create and manage forms</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            </CardContent>
          </Card>

          <Card
            data-tour="submissions-card"
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/submissions')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Submissions</CardTitle>
                  <CardDescription>View form responses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View All Submissions
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/analytics')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Analytics</CardTitle>
                  <CardDescription>Track performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
