import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as pdfjsLib from 'pdfjs-dist'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string | null

    if (!file || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload PDF to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.organization_id}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('pdfs').getPublicUrl(fileName)

    // Get PDF page count
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdfDoc.numPages

    // Create template record
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        organization_id: profile.organization_id,
        name,
        description,
        category,
        pdf_url: publicUrl,
        pdf_pages: pageCount,
        created_by: user.id,
      })
      .select()
      .single()

    if (templateError) {
      console.error('Template creation error:', templateError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
