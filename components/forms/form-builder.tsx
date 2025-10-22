'use client'

/**
 * Form Builder Component
 *
 * Visual form designer that allows users to:
 * - Customize field properties (labels, validation, help text)
 * - Reorder fields with drag-and-drop
 * - Configure form branding (logo, colors, fonts)
 * - Set up email delivery recipients
 * - Preview the form before publishing
 * - Publish form to make it publicly accessible
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { formatDistanceToNow } from 'date-fns'
import slugify from 'slugify'
import {
  Settings,
  Eye,
  Send,
  GripVertical,
  Trash2,
  Plus,
  Palette,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Circle,
  Lock,
  ChevronUp,
  ChevronDown,
  Copy
} from 'lucide-react'

interface FormField {
  id: string
  label: string
  help_text: string | null
  placeholder: string
  is_required: boolean
  validation_rules: any
  conditional_visibility: any
  display_order: number
  template_field: {
    field_name: string
    field_type: string
    page_number: number
  }
}

interface Form {
  id: string
  name: string
  slug: string
  is_published: boolean
  published_at: string | null
  branding: {
    logo: string | null
    primaryColor: string
    font: string
  }
  email_config: {
    recipients: string[]
    subject: string
    includeSubmitterCopy: boolean
  }
  submission_count: number
  completion_rate: number
  form_fields: FormField[]
}

interface FormBuilderProps {
  formId: string
}

export function FormBuilder({ formId }: FormBuilderProps) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activeTab, setActiveTab] = useState<'fields' | 'branding' | 'email' | 'preview'>('fields')
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [newRecipient, setNewRecipient] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationIssues, setValidationIssues] = useState<{field: string, severity: 'error' | 'warning', message: string}[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('')

  const loadForm = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/forms/${formId}`)
      if (!response.ok) {
        throw new Error('Failed to load form')
      }
      const data = await response.json()
      setForm(data.form)
    } catch (error) {
      console.error('Error loading form:', error)
      alert('Failed to load form')
    } finally {
      setIsLoading(false)
    }
  }, [formId])

  useEffect(() => {
    loadForm()
  }, [loadForm])

  const handleSave = async () => {
    if (!form) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          branding: form.branding,
          email_config: form.email_config,
          fields: form.form_fields
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save form')
      }

      alert('Form saved successfully!')
    } catch (error) {
      console.error('Error saving form:', error)
      alert('Failed to save form')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!form) return

    setIsPublishing(true)
    setValidationErrors([])

    try {
      const response = await fetch(`/api/forms/${formId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !form.is_published })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors)
        }
        throw new Error(data.error || 'Failed to publish form')
      }

      setForm({ ...form, is_published: data.form.is_published })

      if (data.publicUrl) {
        alert(`Form published successfully!\n\nPublic URL: ${data.publicUrl}`)
      } else {
        alert('Form unpublished successfully!')
      }
    } catch (error) {
      console.error('Error publishing form:', error)
      alert(error instanceof Error ? error.message : 'Failed to publish form')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
    if (!form) return

    setForm({
      ...form,
      form_fields: form.form_fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    })
  }

  const handleFieldReorder = (fieldId: string, direction: 'up' | 'down') => {
    if (!form) return

    const fields = [...form.form_fields]
    const index = fields.findIndex(f => f.id === fieldId)

    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === fields.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const [movedField] = fields.splice(index, 1)
    fields.splice(newIndex, 0, movedField)

    // Update display_order
    fields.forEach((field, idx) => {
      field.display_order = idx
    })

    setForm({ ...form, form_fields: fields })
  }

  const handleAddRecipient = () => {
    if (!form || !newRecipient) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newRecipient)) {
      alert('Please enter a valid email address')
      return
    }

    const recipients = form.email_config.recipients || []
    if (recipients.includes(newRecipient)) {
      alert('This email is already in the recipient list')
      return
    }

    setForm({
      ...form,
      email_config: {
        ...form.email_config,
        recipients: [...recipients, newRecipient]
      }
    })
    setNewRecipient('')
  }

  const handleRemoveRecipient = (email: string) => {
    if (!form) return

    setForm({
      ...form,
      email_config: {
        ...form.email_config,
        recipients: form.email_config.recipients.filter(r => r !== email)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Form not found</p>
        </CardContent>
      </Card>
    )
  }

  const publicUrl = form.is_published
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms/${form.slug}`
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{form.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {form.is_published ? (
              <Badge className="bg-green-500">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View Public Form <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="outline"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            variant={form.is_published ? 'destructive' : undefined}
          >
            <Send className="mr-2 h-4 w-4" />
            {isPublishing ? 'Processing...' : form.is_published ? 'Unpublish' : 'Publish Form'}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Cannot Publish Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-destructive">{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'fields'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="inline h-4 w-4 mr-2" />
          Fields
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'branding'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="inline h-4 w-4 mr-2" />
          Branding
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'email'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="inline h-4 w-4 mr-2" />
          Email Delivery
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'preview'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="inline h-4 w-4 mr-2" />
          Preview
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'fields' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>
                Customize field labels, validation, and order. Fields are filled into the PDF template at the mapped coordinates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {form.form_fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 mt-2">
                        <button
                          onClick={() => handleFieldReorder(field.id, 'up')}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              {field.template_field.field_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {field.template_field.field_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Page {field.template_field.page_number}
                            </Badge>
                            {field.is_required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Field Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                              placeholder="Label shown to users"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) => handleFieldUpdate(field.id, { placeholder: e.target.value })}
                              placeholder="Example: John Doe"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Help Text</Label>
                          <Input
                            value={field.help_text || ''}
                            onChange={(e) => handleFieldUpdate(field.id, { help_text: e.target.value })}
                            placeholder="Additional instructions for this field"
                            className="mt-1"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) => handleFieldUpdate(field.id, { is_required: e.target.checked })}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Required field</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {form.form_fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No fields found. Please map fields in the template first.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'branding' && (
        <Card>
          <CardHeader>
            <CardTitle>Form Branding</CardTitle>
            <CardDescription>
              Customize the appearance of your public form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Form Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Application Form"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={form.branding.primaryColor}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, primaryColor: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={form.branding.primaryColor}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, primaryColor: e.target.value }
                  })}
                  placeholder="#4F46E5"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Font Family</Label>
              <select
                value={form.branding.font}
                onChange={(e) => setForm({
                  ...form,
                  branding: { ...form.branding, font: e.target.value }
                })}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Delivery Settings</CardTitle>
            <CardDescription>
              Configure where completed forms should be sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email Subject</Label>
              <Input
                value={form.email_config.subject}
                onChange={(e) => setForm({
                  ...form,
                  email_config: { ...form.email_config, subject: e.target.value }
                })}
                placeholder="New Form Submission"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Recipients</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="email@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button onClick={handleAddRecipient} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {form.email_config.recipients?.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{email}</span>
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {(!form.email_config.recipients || form.email_config.recipients.length === 0) && (
                <p className="text-sm text-destructive mt-2">
                  ⚠️ At least one recipient is required to publish the form
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-submitter"
                checked={form.email_config.includeSubmitterCopy}
                onChange={(e) => setForm({
                  ...form,
                  email_config: { ...form.email_config, includeSubmitterCopy: e.target.checked }
                })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="include-submitter" className="font-normal cursor-pointer">
                Send a copy to the form submitter
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Form Preview</CardTitle>
            <CardDescription>
              This is how your form will appear to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-lg p-6 space-y-6"
              style={{
                fontFamily: form.branding.font,
                borderColor: form.branding.primaryColor + '40'
              }}
            >
              <div>
                <h3 className="text-2xl font-bold mb-2">{form.name}</h3>
                <p className="text-sm text-muted-foreground">
                  All fields marked with * are required
                </p>
              </div>

              <div className="space-y-4">
                {form.form_fields.map((field) => (
                  <div key={field.id}>
                    <Label>
                      {field.label}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.help_text && (
                      <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
                    )}
                    <Input
                      placeholder={field.placeholder}
                      disabled
                      className="mt-2"
                      style={{ borderColor: form.branding.primaryColor + '40' }}
                    />
                  </div>
                ))}
              </div>

              <Button
                disabled
                className="w-full"
                style={{ backgroundColor: form.branding.primaryColor }}
              >
                Submit Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
