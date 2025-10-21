/**
 * API Route: Merge Redundant Fields
 *
 * POST /api/templates/[id]/merge-fields
 *
 * Merges multiple redundant fields into a single field group.
 * When generating PDFs, the same data will populate all merged fields.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { validateFieldMerge } from '@/lib/utils/field-deduplication'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Verify template belongs to user's organization
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name, organization_id')
      .eq('id', templateId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      primaryFieldId,
      mergeFieldIds, // Array of field IDs to merge into primary
      groupName // Optional: custom name for the field group
    } = body

    if (!primaryFieldId || !mergeFieldIds || !Array.isArray(mergeFieldIds)) {
      return NextResponse.json(
        { error: 'Invalid request: primaryFieldId and mergeFieldIds required' },
        { status: 400 }
      )
    }

    if (mergeFieldIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be merged' },
        { status: 400 }
      )
    }

    // Fetch all fields to be merged
    const allFieldIds = [primaryFieldId, ...mergeFieldIds]
    const { data: fields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('*')
      .in('id', allFieldIds)
      .eq('template_id', templateId)

    if (fieldsError || !fields) {
      console.error('Error fetching fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to fetch fields' },
        { status: 500 }
      )
    }

    if (fields.length !== allFieldIds.length) {
      return NextResponse.json(
        { error: 'Some fields not found' },
        { status: 404 }
      )
    }

    // Validate fields are compatible for merging
    const validation = validateFieldMerge(fields)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Fields are not compatible for merging',
          issues: validation.issues
        },
        { status: 400 }
      )
    }

    // Create field group (or get existing one)
    const primaryField = fields.find(f => f.id === primaryFieldId)!

    // Check if we need to create a new field group table
    // For now, we'll use a simpler approach: update field metadata

    // Create a group identifier
    const fieldGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update primary field
    const { error: primaryUpdateError } = await supabase
      .from('template_fields')
      .update({
        // Store merged field IDs in metadata (JSONB column)
        metadata: {
          ...(primaryField.metadata || {}),
          fieldGroupId,
          isPrimary: true,
          mergedFieldIds: mergeFieldIds,
          groupName: groupName || primaryField.name
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', primaryFieldId)

    if (primaryUpdateError) {
      console.error('Error updating primary field:', primaryUpdateError)
      return NextResponse.json(
        { error: 'Failed to update primary field' },
        { status: 500 }
      )
    }

    // Update merged fields to reference primary
    const { error: mergeUpdateError } = await supabase
      .from('template_fields')
      .update({
        metadata: {
          fieldGroupId,
          isPrimary: false,
          primaryFieldId,
          groupName: groupName || primaryField.name
        },
        updated_at: new Date().toISOString()
      })
      .in('id', mergeFieldIds)

    if (mergeUpdateError) {
      console.error('Error updating merged fields:', mergeUpdateError)

      // Rollback primary field update
      await supabase
        .from('template_fields')
        .update({
          metadata: primaryField.metadata
        })
        .eq('id', primaryFieldId)

      return NextResponse.json(
        { error: 'Failed to merge fields' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fieldGroupId,
      primaryFieldId,
      mergedCount: mergeFieldIds.length,
      groupName: groupName || primaryField.name,
      message: `Successfully merged ${mergeFieldIds.length} fields into "${primaryField.name}"`
    })

  } catch (error) {
    console.error('Error merging fields:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/templates/[id]/merge-fields
 *
 * Returns information about merged field groups for a template
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Verify access to template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name')
      .eq('id', templateId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch all fields with merge metadata
    const { data: fields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('id, name, metadata, page, field_type')
      .eq('template_id', templateId)

    if (fieldsError) {
      console.error('Error fetching fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to fetch fields' },
        { status: 500 }
      )
    }

    // Group fields by fieldGroupId
    const fieldGroups = new Map<string, any[]>()

    fields?.forEach(field => {
      const groupId = field.metadata?.fieldGroupId
      if (groupId) {
        if (!fieldGroups.has(groupId)) {
          fieldGroups.set(groupId, [])
        }
        fieldGroups.get(groupId)!.push(field)
      }
    })

    // Convert to array format
    const groups = Array.from(fieldGroups.entries()).map(([groupId, groupFields]) => {
      const primaryField = groupFields.find(f => f.metadata?.isPrimary)
      const mergedFields = groupFields.filter(f => !f.metadata?.isPrimary)

      return {
        groupId,
        groupName: primaryField?.metadata?.groupName || primaryField?.name,
        primaryField: {
          id: primaryField?.id,
          name: primaryField?.name,
          page: primaryField?.page
        },
        mergedFields: mergedFields.map(f => ({
          id: f.id,
          name: f.name,
          page: f.page
        })),
        totalFields: groupFields.length
      }
    })

    return NextResponse.json({
      templateId,
      templateName: template.name,
      fieldGroups: groups,
      totalGroups: groups.length
    })

  } catch (error) {
    console.error('Error fetching field groups:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
