'use client'

/**
 * Submissions Dashboard
 *
 * Displays and manages form submissions for the organization
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Download,
  Mail,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Submission {
  id: string
  form_id: string
  submitter_email: string
  submitter_name: string | null
  status: string
  generated_pdf_url: string | null
  created_at: string
  submitted_at: string | null
  form: {
    id: string
    name: string
    slug: string
  }
  email_deliveries: Array<{
    id: string
    recipient_email: string
    status: string
    sent_at: string | null
    error_message: string | null
  }>
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [forms, setForms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [selectedForm, setSelectedForm] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

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

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      })

      if (selectedForm) params.set('form_id', selectedForm)
      if (selectedStatus) params.set('status', selectedStatus)

      const response = await fetch(`/api/submissions/list?${params}`)
      if (!response.ok) throw new Error('Failed to load submissions')

      const data = await response.json()
      setSubmissions(data.submissions || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, selectedForm, selectedStatus, limit])

  useEffect(() => {
    loadForms()
    loadSubmissions()
  }, [loadSubmissions])

  const filteredSubmissions = submissions.filter(sub =>
    !searchQuery ||
    sub.submitter_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.form.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEmailStatusIcon = (deliveries: Submission['email_deliveries']) => {
    if (!deliveries || deliveries.length === 0) {
      return <Clock className="h-4 w-4 text-muted-foreground" />
    }

    const hasFailures = deliveries.some(d => d.status === 'failed')
    const allSent = deliveries.every(d => d.status === 'sent')

    if (hasFailures) {
      return <XCircle className="h-4 w-4 text-destructive" />
    } else if (allSent) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else {
      return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const totalPages = Math.ceil(total / limit)

  if (isLoading && submissions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading submissions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Submissions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage form submissions
          </p>
        </div>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.status === 'failed').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by email or form..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <select
                value={selectedForm}
                onChange={(e) => {
                  setSelectedForm(e.target.value)
                  setPage(0)
                }}
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

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <Button
              onClick={() => {
                setSelectedForm('')
                setSelectedStatus('')
                setSearchQuery('')
                setPage(0)
              }}
              variant="outline"
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      {filteredSubmissions.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-4 font-medium">Form</th>
                      <th className="p-4 font-medium">Submitter</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{submission.form.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {submission.id.slice(0, 8)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            {submission.submitter_name && (
                              <p className="font-medium">{submission.submitter_name}</p>
                            )}
                            <p className={submission.submitter_name ? "text-xs text-muted-foreground" : ""}>
                              {submission.submitter_email}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getEmailStatusIcon(submission.email_deliveries)}
                            <span className="text-sm">
                              {submission.email_deliveries?.length || 0} sent
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setSelectedSubmission(submission)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {submission.generated_pdf_url && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                              >
                                <a
                                  href={submission.generated_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} results
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedForm || selectedStatus
                ? 'No submissions match your filters'
                : 'Submissions will appear here once forms are filled out'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Submission Details</CardTitle>
                  <CardDescription>{selectedSubmission.form.name}</CardDescription>
                </div>
                <Button
                  onClick={() => setSelectedSubmission(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Submitter Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedSubmission.submitter_name && (
                    <p><strong>Name:</strong> {selectedSubmission.submitter_name}</p>
                  )}
                  <p><strong>Email:</strong> {selectedSubmission.submitter_email}</p>
                  <p>
                    <strong>Submitted:</strong>{' '}
                    {new Date(selectedSubmission.submitted_at || selectedSubmission.created_at).toLocaleString()}
                  </p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedSubmission.status)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Email Deliveries</h4>
                <div className="space-y-2">
                  {selectedSubmission.email_deliveries?.map((delivery) => (
                    <div key={delivery.id} className="bg-muted rounded-md p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{delivery.recipient_email}</span>
                        <Badge variant={delivery.status === 'sent' ? 'default' : 'destructive'}>
                          {delivery.status}
                        </Badge>
                      </div>
                      {delivery.sent_at && (
                        <p className="text-xs text-muted-foreground">
                          Sent: {new Date(delivery.sent_at).toLocaleString()}
                        </p>
                      )}
                      {delivery.error_message && (
                        <p className="text-xs text-destructive mt-1">
                          Error: {delivery.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedSubmission.generated_pdf_url && (
                <div className="border-t pt-4">
                  <Button asChild className="w-full">
                    <a
                      href={selectedSubmission.generated_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
