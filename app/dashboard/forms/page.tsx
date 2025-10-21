'use client'

/**
 * Forms List Page
 *
 * Displays all forms for the organization and allows creating new forms from templates
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  FileText,
  ExternalLink,
  Settings,
  Trash2,
  Search,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react'

interface Template {
  id: string
  name: string
  file_name: string
}

interface Form {
  id: string
  name: string
  slug: string
  is_published: boolean
  published_at: string | null
  created_at: string
  submission_count: number
  completion_rate: number
  template: Template
  form_fields: any[]
}

export default function FormsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadForms()
    loadTemplates()
  }, [])

  const loadForms = async () => {
    try {
      const response = await fetch('/api/forms')
      if (!response.ok) throw new Error('Failed to load forms')
      const data = await response.json()
      setForms(data.forms || [])
    } catch (error) {
      console.error('Error loading forms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) throw new Error('Failed to load templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleCreateForm = async () => {
    if (!selectedTemplate || !formName) {
      alert('Please select a template and enter a form name')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate,
          name: formName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create form')
      }

      const data = await response.json()
      router.push(`/dashboard/forms/${data.form.id}`)
    } catch (error) {
      console.error('Error creating form:', error)
      alert('Failed to create form')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete form')
      }

      setForms(forms.filter(f => f.id !== formId))
      alert('Form deleted successfully')
    } catch (error) {
      console.error('Error deleting form:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete form')
    }
  }

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.template.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const publicUrl = (slug: string) =>
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms/${slug}`

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading forms...</p>
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
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage web forms from your PDF templates
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {/* Stats */}
      {forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Forms</p>
                  <p className="text-2xl font-bold">{forms.length}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold">
                    {forms.filter(f => f.is_published).length}
                  </p>
                </div>
                <ExternalLink className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">
                    {forms.reduce((sum, f) => sum + (f.submission_count || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      {forms.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Forms List */}
      {filteredForms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Template: {form.template.name}
                    </CardDescription>
                  </div>
                  {form.is_published ? (
                    <Badge className="bg-green-500">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{form.submission_count || 0} submissions</span>
                    </div>
                    {form.completion_rate > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>{form.completion_rate}%</span>
                      </div>
                    )}
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {new Date(form.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Public URL */}
                  {form.is_published && (
                    <div className="pt-2 border-t">
                      <a
                        href={publicUrl(form.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Public Form
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteForm(form.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first form from a PDF template to get started
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Form</CardTitle>
              <CardDescription>
                Generate a web form from one of your PDF templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Form Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Job Application Form"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Select Template</Label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormName('')
                    setSelectedTemplate('')
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateForm}
                  disabled={isCreating || !selectedTemplate || !formName}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
