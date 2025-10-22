'use client'

/**
 * Public Form Page
 *
 * Publicly accessible form submission page
 * - No authentication required
 * - Real-time validation
 * - Draft save & resume
 * - GDPR consent
 * - PDF generation & email delivery
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Save, Send, Loader2, FileText } from 'lucide-react'

interface FormField {
  id: string
  label: string
  help_text: string | null
  placeholder: string
  is_required: boolean
  validation_rules: any
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
  branding: {
    logo: string | null
    primaryColor: string
    font: string
  }
  form_fields: FormField[]
}

export default function PublicFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const draftToken = searchParams.get('token')

  const [form, setForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const loadForm = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/forms/public/${slug}`)
      if (!response.ok) {
        throw new Error('Form not found')
      }
      const data = await response.json()
      setForm(data.form)
    } catch (error) {
      console.error('Error loading form:', error)
      setSubmitStatus('error')
      setSubmitMessage('Form not found or no longer available')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  const loadDraft = useCallback(async (token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/submissions/draft?token=${token}`)
      if (!response.ok) {
        throw new Error('Draft not found')
      }
      const data = await response.json()
      setForm(data.draft.form)
      setFormData(data.draft.form_data || {})
      setSubmitterEmail(data.draft.submitter_email || '')
    } catch (error) {
      console.error('Error loading draft:', error)
      setSubmitMessage('Draft not found or expired. Please start a new submission.')
      // Try loading the form normally
      loadForm()
    } finally {
      setIsLoading(false)
    }
  }, [loadForm])

  useEffect(() => {
    if (draftToken) {
      loadDraft(draftToken)
    } else {
      loadForm()
    }
  }, [draftToken, loadDraft, loadForm])

  const validateField = (field: FormField, value: any): string | null => {
    // Required field validation
    if (field.is_required && (!value || String(value).trim() === '')) {
      return `${field.label} is required`
    }

    if (!value) return null

    // Email validation
    if (field.template_field.field_type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        return 'Invalid email address'
      }
    }

    // Number validation
    if (field.template_field.field_type === 'number') {
      if (isNaN(Number(value))) {
        return 'Must be a valid number'
      }
    }

    // Custom regex validation
    if (field.validation_rules?.regex) {
      const regex = new RegExp(field.validation_rules.regex)
      if (!regex.test(String(value))) {
        return field.validation_rules.message || 'Invalid format'
      }
    }

    return null
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value })

    // Clear error for this field
    if (errors[fieldName]) {
      const newErrors = { ...errors }
      delete newErrors[fieldName]
      setErrors(newErrors)
    }
  }

  const handleSaveDraft = async () => {
    if (!form || !submitterEmail) {
      alert('Please enter your email address to save progress')
      return
    }

    setIsSavingDraft(true)
    try {
      const response = await fetch('/api/submissions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.id,
          form_data: formData,
          submitter_email: submitterEmail
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      const data = await response.json()
      alert(`Progress saved! A resume link has been sent to ${submitterEmail}.\n\nResume URL: ${data.draft.resume_url}`)
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form) return

    // Validate all fields
    const newErrors: Record<string, string> = {}

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!submitterEmail || !emailRegex.test(submitterEmail)) {
      newErrors['submitter_email'] = 'Valid email address is required'
    }

    // Validate form fields
    form.form_fields.forEach(field => {
      const fieldName = field.template_field.field_name
      const error = validateField(field, formData[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })

    // Validate consent
    if (!consentGiven) {
      newErrors['consent'] = 'You must agree to the data processing terms'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.id,
          form_data: formData,
          submitter_email: submitterEmail,
          consent_given: consentGiven,
          draft_token: draftToken || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitStatus('success')
      setSubmitMessage('Form submitted successfully! Your PDF has been generated and sent to the recipients.')
      setPdfUrl(data.submission.pdf_url)

      // Clear form data
      setFormData({})
      setSubmitterEmail('')
      setConsentGiven(false)
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">{submitMessage || 'This form is not available or has been removed.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Submission Successful!</h2>
            <p className="text-muted-foreground mb-6">{submitMessage}</p>
            {pdfUrl && (
              <Button asChild variant="outline">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gray-50 py-12 px-4"
      style={{ fontFamily: form.branding.font }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{form.name}</CardTitle>
            <CardDescription>
              Please fill out all required fields marked with *
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Please fix the following errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                    {Object.values(errors).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-6">
              {/* Submitter Email */}
              <div>
                <Label htmlFor="submitter_email">
                  Your Email Address
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  We&apos;ll send you a copy of the completed form
                </p>
                <Input
                  id="submitter_email"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={errors['submitter_email'] ? 'border-destructive' : ''}
                  style={{ borderColor: errors['submitter_email'] ? undefined : form.branding.primaryColor + '40' }}
                />
                {errors['submitter_email'] && (
                  <p className="text-sm text-destructive mt-1">{errors['submitter_email']}</p>
                )}
              </div>

              {/* Form Fields */}
              {form.form_fields.map((field) => {
                const fieldName = field.template_field.field_name
                const value = formData[fieldName] || ''
                const hasError = !!errors[fieldName]

                return (
                  <div key={field.id}>
                    <Label htmlFor={fieldName}>
                      {field.label}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.help_text && (
                      <p className="text-xs text-muted-foreground mt-1 mb-2">{field.help_text}</p>
                    )}

                    {field.template_field.field_type === 'textarea' ? (
                      <textarea
                        id={fieldName}
                        value={value}
                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full rounded-md border px-3 py-2 text-sm ${
                          hasError ? 'border-destructive' : 'border-input'
                        }`}
                        rows={4}
                        style={{ borderColor: hasError ? undefined : form.branding.primaryColor + '40' }}
                      />
                    ) : (
                      <Input
                        id={fieldName}
                        type={field.template_field.field_type === 'number' ? 'number' :
                              field.template_field.field_type === 'email' ? 'email' :
                              field.template_field.field_type === 'date' ? 'date' : 'text'}
                        value={value}
                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                        placeholder={field.placeholder}
                        className={hasError ? 'border-destructive' : ''}
                        style={{ borderColor: hasError ? undefined : form.branding.primaryColor + '40' }}
                      />
                    )}

                    {hasError && (
                      <p className="text-sm text-destructive mt-1">{errors[fieldName]}</p>
                    )}
                  </div>
                )
              })}

              {/* GDPR Consent */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className={`mt-1 rounded border ${errors['consent'] ? 'border-destructive' : 'border-gray-300'}`}
                  />
                  <Label htmlFor="consent" className="font-normal cursor-pointer flex-1">
                    I consent to the processing of my personal data as described in this form. My data will be used solely for the purpose of processing this submission and will be handled in accordance with GDPR regulations.
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                </div>
                {errors['consent'] && (
                  <p className="text-sm text-destructive mt-2 ml-7">{errors['consent']}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              variant="outline"
              className="flex-1"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Progress
                </>
              )}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSavingDraft}
              className="flex-1"
              style={{ backgroundColor: form.branding.primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Form
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Tramite • This form is secured and your data is protected according to GDPR regulations
        </p>
      </div>
    </div>
  )
}
