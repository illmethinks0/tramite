'use client'

/**
 * Analytics Dashboard
 *
 * Displays form performance metrics and insights
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Send,
  BarChart3,
  Download,
  Calendar,
  MonitorSmartphone,
  Globe
} from 'lucide-react'

interface AnalyticsData {
  forms: Array<{
    form_id: string
    form_name: string
    total_views: number
    total_starts: number
    total_submissions: number
    total_abandons: number
    conversion_rate: number
    avg_time_to_complete: string | null
  }>
  summary: {
    total_views: number
    total_submissions: number
    total_forms: number
    avg_conversion_rate: number
    period_start: string
    period_end: string
  }
  timeline: Array<{
    date: string
    views: number
    submissions: number
    abandons: number
  }>
  deviceStats: {
    devices: Record<string, number>
    browsers: Record<string, number>
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [forms, setForms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<string>('')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadForms()
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [selectedForm, dateRange])

  const loadForms = async () => {
    try {
      const response = await fetch('/api/forms')
      if (!response.ok) throw new Error('Failed to load forms')
      const data = await response.json()
      setForms(data.forms || [])
    } catch (error) {
      console.error('Error loading forms:', error)
    }
  }

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[dateRange]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      })

      if (selectedForm) {
        params.set('form_id', selectedForm)
      }

      const response = await fetch(`/api/analytics?${params}`)
      if (!response.ok) throw new Error('Failed to load analytics')

      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!analytics) return

    const rows = [
      ['Date', 'Views', 'Submissions', 'Abandons', 'Conversion Rate'],
      ...analytics.timeline.map(day => [
        day.date,
        day.views.toString(),
        day.submissions.toString(),
        day.abandons.toString(),
        day.views > 0 ? `${((day.submissions / day.views) * 100).toFixed(2)}%` : '0%'
      ])
    ]

    const csv = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${dateRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading && !analytics) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const maxViews = Math.max(...analytics.timeline.map(d => d.views), 1)
  const maxSubmissions = Math.max(...analytics.timeline.map(d => d.submissions), 1)

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track form performance and user behavior
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">All Forms</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                  onClick={() => setDateRange(range)}
                  variant={dateRange === range ? undefined : 'outline'}
                  size="sm"
                >
                  {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-3xl font-bold">{analytics.summary.total_views.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-3xl font-bold">{analytics.summary.total_submissions.toLocaleString()}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold">
                  {analytics.summary.avg_conversion_rate.toFixed(1)}%
                </p>
              </div>
              {analytics.summary.avg_conversion_rate >= 50 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-orange-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Forms</p>
                <p className="text-3xl font-bold">{analytics.summary.total_forms}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
          <CardDescription>Views and submissions by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Views Chart */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Views</p>
                <Badge variant="outline" className="text-blue-600">
                  {analytics.timeline.reduce((sum, d) => sum + d.views, 0)} total
                </Badge>
              </div>
              <div className="space-y-1">
                {analytics.timeline.map((day) => (
                  <div key={day.date} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full flex items-center justify-end pr-2"
                        style={{ width: `${(day.views / maxViews) * 100}%` }}
                      >
                        {day.views > 0 && (
                          <span className="text-xs text-white font-medium">{day.views}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submissions Chart */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Submissions</p>
                <Badge variant="outline" className="text-green-600">
                  {analytics.timeline.reduce((sum, d) => sum + d.submissions, 0)} total
                </Badge>
              </div>
              <div className="space-y-1">
                {analytics.timeline.map((day) => (
                  <div key={day.date} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-green-500 h-full flex items-center justify-end pr-2"
                        style={{ width: `${(day.submissions / maxSubmissions) * 100}%` }}
                      >
                        {day.submissions > 0 && (
                          <span className="text-xs text-white font-medium">{day.submissions}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Performance Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Form Performance</CardTitle>
          <CardDescription>Detailed metrics for each form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-3 font-medium">Form Name</th>
                  <th className="p-3 font-medium">Views</th>
                  <th className="p-3 font-medium">Submissions</th>
                  <th className="p-3 font-medium">Conversion</th>
                  <th className="p-3 font-medium">Avg. Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics.forms.map((form) => (
                  <tr key={form.form_id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{form.form_name}</td>
                    <td className="p-3">{form.total_views.toLocaleString()}</td>
                    <td className="p-3">{form.total_submissions.toLocaleString()}</td>
                    <td className="p-3">
                      <Badge
                        variant={form.conversion_rate >= 50 ? 'default' : 'secondary'}
                        className={form.conversion_rate >= 50 ? 'bg-green-500' : ''}
                      >
                        {form.conversion_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {form.avg_time_to_complete
                        ? formatInterval(form.avg_time_to_complete)
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Device & Browser Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.deviceStats.devices).map(([device, count]) => {
                const total = Object.values(analytics.deviceStats.devices).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0

                return (
                  <div key={device}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{device}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Browsers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.deviceStats.browsers).map(([browser, count]) => {
                const total = Object.values(analytics.deviceStats.browsers).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0

                return (
                  <div key={browser}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{browser}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatInterval(interval: string): string {
  // Parse PostgreSQL interval format (e.g., "00:05:30")
  const match = interval.match(/(\d+):(\d+):(\d+)/)
  if (!match) return interval

  const hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const seconds = parseInt(match[3])

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}
