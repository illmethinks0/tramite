/**
 * Field Deduplication Utilities
 *
 * Intelligently detects redundant fields across multiple PDF pages/documents
 * using fuzzy matching, position proximity, and field type analysis.
 */

import { TemplateField } from '@/types/database'

export interface RedundantGroup {
  groupId: string
  suggestedName: string
  confidence: number // 0.0 - 1.0
  matchReason: 'exact_name' | 'fuzzy_name' | 'position_proximity' | 'combined'
  fields: Array<{
    fieldId: string
    name: string
    page: number
    x: number
    y: number
    fieldType: string
  }>
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy field name matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculate similarity score between two strings (0.0 - 1.0)
 */
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength)
}

/**
 * Normalize field name for comparison
 * Removes special characters, converts to lowercase, trims whitespace
 */
function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-\s]+/g, '') // Remove underscores, hyphens, spaces
    .trim()
}

/**
 * Calculate coordinate proximity score (0.0 - 1.0)
 * Fields with similar positions likely represent the same data
 */
function coordinateProximity(
  field1: { x: number; y: number },
  field2: { x: number; y: number },
  pageWidth = 595, // Standard A4 width in points
  pageHeight = 842 // Standard A4 height in points
): number {
  const xDistance = Math.abs(field1.x - field2.x)
  const yDistance = Math.abs(field1.y - field2.y)

  // Normalize distances by page dimensions
  const normalizedXDistance = xDistance / pageWidth
  const normalizedYDistance = yDistance / pageHeight

  // Euclidean distance
  const distance = Math.sqrt(
    normalizedXDistance ** 2 + normalizedYDistance ** 2
  )

  // Convert to similarity score (closer = higher score)
  // Threshold: 20% of page diagonal
  const maxDistance = 0.2
  const proximity = Math.max(0, 1 - (distance / maxDistance))

  return proximity
}

/**
 * Detect redundant fields across pages/documents
 */
export function detectRedundantFields(
  fields: TemplateField[],
  options: {
    nameSimilarityThreshold?: number // Default: 0.85 (85% similar)
    positionProximityThreshold?: number // Default: 0.7 (70% similar position)
    exactMatchOnly?: boolean // Default: false
  } = {}
): RedundantGroup[] {
  const {
    nameSimilarityThreshold = 0.85,
    positionProximityThreshold = 0.7,
    exactMatchOnly = false
  } = options

  const groups: RedundantGroup[] = []
  const processedFieldIds = new Set<string>()

  // Sort fields by page for efficient comparison
  const sortedFields = [...fields].sort((a, b) => a.page_number - b.page_number)

  for (let i = 0; i < sortedFields.length; i++) {
    const field1 = sortedFields[i]

    // Skip if already grouped
    if (processedFieldIds.has(field1.id)) continue

    const potentialMatches: typeof sortedFields = []
    const normalizedName1 = normalizeFieldName(field1.field_name)

    for (let j = i + 1; j < sortedFields.length; j++) {
      const field2 = sortedFields[j]

      // Skip if already grouped
      if (processedFieldIds.has(field2.id)) continue

      // Skip if different field types (e.g., text vs date)
      if (field1.field_type !== field2.field_type) continue

      const normalizedName2 = normalizeFieldName(field2.field_name)

      // Exact name match (after normalization)
      if (normalizedName1 === normalizedName2) {
        potentialMatches.push(field2)
        continue
      }

      // Skip fuzzy matching if exact match only
      if (exactMatchOnly) continue

      // Fuzzy name matching
      const nameSimilarity = stringSimilarity(field1.field_name, field2.field_name)

      // Position proximity (especially useful for multi-page forms)
      const positionSimilarity = coordinateProximity(
        { x: field1.x_coordinate, y: field1.y_coordinate },
        { x: field2.x_coordinate, y: field2.y_coordinate }
      )

      // Combined score: 70% name similarity + 30% position similarity
      const combinedScore = (nameSimilarity * 0.7) + (positionSimilarity * 0.3)

      if (
        nameSimilarity >= nameSimilarityThreshold ||
        (positionSimilarity >= positionProximityThreshold && nameSimilarity >= 0.6) ||
        combinedScore >= 0.75
      ) {
        potentialMatches.push(field2)
      }
    }

    // Create group if matches found
    if (potentialMatches.length > 0) {
      const allFieldsInGroup = [field1, ...potentialMatches]

      // Mark all as processed
      allFieldsInGroup.forEach(f => processedFieldIds.add(f.id))

      // Calculate average similarity for confidence score
      const similarities = potentialMatches.map(f2 =>
        stringSimilarity(field1.field_name, f2.field_name)
      )
      const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length

      // Determine match reason
      const allExactMatch = potentialMatches.every(f2 =>
        normalizeFieldName(f2.field_name) === normalizedName1
      )

      let matchReason: RedundantGroup['matchReason']
      if (allExactMatch) {
        matchReason = 'exact_name'
      } else if (avgSimilarity >= nameSimilarityThreshold) {
        matchReason = 'fuzzy_name'
      } else {
        matchReason = 'combined'
      }

      // Suggest common name (most frequent or shortest)
      const nameCounts = new Map<string, number>()
      allFieldsInGroup.forEach(f => {
        const count = nameCounts.get(f.field_name) || 0
        nameCounts.set(f.field_name, count + 1)
      })
      const suggestedName = Array.from(nameCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0]

      groups.push({
        groupId: `group_${field1.id}_${Date.now()}`,
        suggestedName,
        confidence: Math.min(avgSimilarity, 1.0),
        matchReason,
        fields: allFieldsInGroup.map(f => ({
          fieldId: f.id,
          name: f.field_name,
          page: f.page_number,
          x: f.x_coordinate,
          y: f.y_coordinate,
          fieldType: f.field_type || 'text'
        }))
      })
    }
  }

  // Sort groups by confidence (highest first)
  return groups.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Suggest field merges with explanations
 */
export function suggestFieldMerges(
  groups: RedundantGroup[]
): Array<{
  groupId: string
  suggestion: string
  confidence: number
  autoMergeable: boolean
}> {
  return groups.map(group => {
    const { confidence, matchReason, fields } = group

    let suggestion = ''
    let autoMergeable = false

    if (matchReason === 'exact_name' && confidence >= 0.95) {
      suggestion = `Fields have identical names across ${fields.length} pages. Safe to merge automatically.`
      autoMergeable = true
    } else if (matchReason === 'fuzzy_name' && confidence >= 0.9) {
      suggestion = `Fields have very similar names (${Math.round(confidence * 100)}% match). Review and merge if they represent the same data.`
      autoMergeable = false
    } else if (matchReason === 'combined') {
      suggestion = `Fields detected as similar based on name and position. Verify before merging.`
      autoMergeable = false
    } else {
      suggestion = `Potential match with ${Math.round(confidence * 100)}% confidence. Manual review recommended.`
      autoMergeable = false
    }

    return {
      groupId: group.groupId,
      suggestion,
      confidence,
      autoMergeable
    }
  })
}

/**
 * Validate field merge compatibility
 * Ensures fields are safe to merge (same type, compatible validation)
 */
export function validateFieldMerge(fields: TemplateField[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check field types match
  const fieldTypes = new Set(fields.map(f => f.field_type))
  if (fieldTypes.size > 1) {
    issues.push(`Fields have different types: ${Array.from(fieldTypes).join(', ')}`)
  }

  // Check validation rules are compatible
  const validationRules = fields
    .map(f => f.validation_regex)
    .filter(Boolean)

  if (validationRules.length > 1 && new Set(validationRules).size > 1) {
    issues.push('Fields have conflicting validation rules')
  }

  // Check required flags match (or at least one is required)
  const requiredFlags = fields.map(f => f.is_required)
  if (requiredFlags.includes(true) && requiredFlags.includes(false)) {
    issues.push('Some fields are required while others are not')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}
