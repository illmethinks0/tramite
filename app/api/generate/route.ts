import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { templateId, data: formData } = await request.json()

    if (!templateId || !formData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Fetch template fields
    const { data: fields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', templateId)

    if (fieldsError) {
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 })
    }

    // Download template PDF
    const pdfResponse = await fetch(template.pdf_url)
    const pdfBytes = await pdfResponse.arrayBuffer()

    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes)
    pdfDoc.registerFontkit(fontkit)

    // Embed font for text rendering
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const pages = pdfDoc.getPages()
    let fieldsProcessed = 0

    // Group fields by page
    const fieldsByPage = fields?.reduce((acc: any, field: any) => {
      if (!acc[field.page_number]) {
        acc[field.page_number] = []
      }
      acc[field.page_number].push(field)
      return acc
    }, {}) || {}

    // Build map of merged fields for efficient lookup
    const mergedFieldMap = new Map<string, string>()
    fields?.forEach((field: any) => {
      if (field.metadata?.isPrimary === false && field.metadata?.primaryFieldId) {
        // This field is merged - map it to primary field ID
        mergedFieldMap.set(field.id, field.metadata.primaryFieldId)
      }
    })

    // Fill fields
    for (const [pageNum, pageFields] of Object.entries(fieldsByPage)) {
      const pageIndex = parseInt(pageNum as string) - 1
      const page = pages[pageIndex]

      if (!page) continue

      for (const field of pageFields as any[]) {
        // Check if this field is part of a merged group
        let fieldName = field.field_name

        if (field.metadata?.isPrimary === false && field.metadata?.primaryFieldId) {
          // Find the primary field to get its name
          const primaryField = fields?.find((f: any) => f.id === field.metadata.primaryFieldId)
          if (primaryField) {
            fieldName = primaryField.field_name
          }
        }

        const value = formData[fieldName]

        if (value !== undefined && value !== null && value !== '') {
          try {
            page.drawText(String(value), {
              x: parseFloat(field.x_coordinate),
              y: parseFloat(field.y_coordinate),
              size: parseFloat(field.font_size || 12),
              font: font,
              color: rgb(0, 0, 0),
            })

            fieldsProcessed++
          } catch (error) {
            console.warn(`Failed to draw field ${field.field_name}:`, error)
          }
        }
      }
    }

    // Save filled PDF
    const filledPdfBytes = await pdfDoc.save()

    // Upload to temporary storage
    const fileName = `generated/${profile.organization_id}/${Date.now()}-${template.name}.pdf`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, filledPdfBytes, {
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload generated PDF' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('pdfs').getPublicUrl(fileName)

    const processingTime = Date.now() - startTime

    // Log to generated_pdfs table
    await supabase.from('generated_pdfs').insert({
      organization_id: profile.organization_id,
      template_id: templateId,
      user_id: user.id,
      pdf_url: publicUrl,
      file_size_bytes: filledPdfBytes.length,
      fields_filled: fieldsProcessed,
      processing_time_ms: processingTime,
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      fileName: fileName.split('/').pop(),
      fileSize: filledPdfBytes.length,
      fieldsProcessed,
      processingTime,
    })
  } catch (error) {
    console.error('Generate PDF error:', error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        processingTime,
      },
      { status: 500 }
    )
  }
}
