/**
 * API Route: Detect Redundant Fields
 *
 * POST /api/templates/[id]/detect-redundant
 *
 * Analyzes template fields and identifies potential duplicates
 * across multiple pages using intelligent matching algorithms.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { detectRedundantFields, suggestFieldMerges } from '@/lib/utils/field-deduplication'

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
      .select('organization_id')
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

    // Fetch all fields for this template
    const { data: fields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('page', { ascending: true })
      .order('name', { ascending: true })

    if (fieldsError) {
      console.error('Error fetching fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to fetch template fields' },
        { status: 500 }
      )
    }

    if (!fields || fields.length === 0) {
      return NextResponse.json({
        redundantGroups: [],
        message: 'No fields found for this template'
      })
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const {
      nameSimilarityThreshold = 0.85,
      positionProximityThreshold = 0.7,
      exactMatchOnly = false
    } = body

    // Detect redundant fields
    const redundantGroups = detectRedundantFields(fields, {
      nameSimilarityThreshold,
      positionProximityThreshold,
      exactMatchOnly
    })

    // Generate merge suggestions
    const mergeSuggestions = suggestFieldMerges(redundantGroups)

    return NextResponse.json({
      templateId,
      templateName: template.name,
      totalFields: fields.length,
      redundantGroups,
      mergeSuggestions,
      detectionOptions: {
        nameSimilarityThreshold,
        positionProximityThreshold,
        exactMatchOnly
      }
    })

  } catch (error) {
    console.error('Error detecting redundant fields:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
