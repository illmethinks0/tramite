import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: templateId } = await params
    const { fields } = await request.json()

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid fields data' }, { status: 400 })
    }

    // Delete existing fields for this template
    await supabase
      .from('template_fields')
      .delete()
      .eq('template_id', templateId)

    // Insert new fields
    const { data, error } = await supabase
      .from('template_fields')
      .insert(
        fields.map((field: any) => ({
          template_id: templateId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type || 'text',
          page_number: field.page_number || 1,
          x_coordinate: field.x_coordinate,
          y_coordinate: field.y_coordinate,
          width: field.width,
          height: field.height,
          font_size: field.font_size || 12,
          font_family: field.font_family || 'Helvetica',
          is_required: field.is_required || false,
          default_value: field.default_value,
          validation_regex: field.validation_regex,
        }))
      )
      .select()

    if (error) {
      console.error('Field insertion error:', error)
      return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 })
    }

    return NextResponse.json({ success: true, fields: data })
  } catch (error) {
    console.error('Save fields error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', id)
      .order('field_name')

    if (error) {
      console.error('Fetch fields error:', error)
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get fields error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
