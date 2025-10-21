'use client'

/**
 * Redundant Field Detector Component
 *
 * Displays detected redundant fields and allows users to merge them.
 * Integrates with the visual PDF mapper to improve field management.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Merge, X } from 'lucide-react'

interface RedundantGroup {
  groupId: string
  suggestedName: string
  confidence: number
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

interface RedundantFieldDetectorProps {
  templateId: string
  onDetect?: () => void
  onMergeComplete?: (groupId: string) => void
}

export function RedundantFieldDetector({
  templateId,
  onDetect,
  onMergeComplete
}: RedundantFieldDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [redundantGroups, setRedundantGroups] = useState<RedundantGroup[]>([])
  const [mergeSuggestions, setMergeSuggestions] = useState<any[]>([])
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(new Set())

  const handleDetect = async () => {
    setIsDetecting(true)
    try {
      const response = await fetch(`/api/templates/${templateId}/detect-redundant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to detect redundant fields')
      }

      const data = await response.json()
      setRedundantGroups(data.redundantGroups || [])
      setMergeSuggestions(data.mergeSuggestions || [])
      onDetect?.()
    } catch (error) {
      console.error('Error detecting redundant fields:', error)
      alert('Failed to detect redundant fields. Please try again.')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleMerge = async (group: RedundantGroup) => {
    const primaryFieldId = group.fields[0].fieldId
    const mergeFieldIds = group.fields.slice(1).map(f => f.fieldId)

    try {
      const response = await fetch(`/api/templates/${templateId}/merge-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryFieldId,
          mergeFieldIds,
          groupName: group.suggestedName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to merge fields')
      }

      const result = await response.json()
      alert(`Successfully merged ${result.mergedCount} fields!`)

      // Remove merged group from list
      setRedundantGroups(prev => prev.filter(g => g.groupId !== group.groupId))
      onMergeComplete?.(group.groupId)
    } catch (error) {
      console.error('Error merging fields:', error)
      alert(error instanceof Error ? error.message : 'Failed to merge fields')
    }
  }

  const handleDismiss = (groupId: string) => {
    setDismissedGroups(prev => new Set(prev).add(groupId))
  }

  const visibleGroups = redundantGroups.filter(g => !dismissedGroups.has(g.groupId))

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  const getMatchReasonLabel = (reason: RedundantGroup['matchReason']) => {
    switch (reason) {
      case 'exact_name':
        return 'Exact Name Match'
      case 'fuzzy_name':
        return 'Similar Names'
      case 'position_proximity':
        return 'Similar Position'
      case 'combined':
        return 'Name + Position'
    }
  }

  return (
    <div className="space-y-4">
      {/* Detection Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Redundant Field Detection</h3>
          <p className="text-sm text-muted-foreground">
            Find and merge duplicate fields across pages
          </p>
        </div>
        <Button
          onClick={handleDetect}
          disabled={isDetecting}
          variant="outline"
        >
          {isDetecting ? 'Detecting...' : 'Detect Redundant Fields'}
        </Button>
      </div>

      {/* Results */}
      {visibleGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <p className="text-sm font-medium">
              Found {visibleGroups.length} potential redundant field{visibleGroups.length !== 1 ? 's' : ''}
            </p>
          </div>

          {visibleGroups.map((group, index) => {
            const suggestion = mergeSuggestions.find(s => s.groupId === group.groupId)

            return (
              <Card key={group.groupId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {group.suggestedName}
                      </CardTitle>
                      <CardDescription>
                        {group.fields.length} fields detected as redundant
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={getConfidenceColor(group.confidence)}>
                      {Math.round(group.confidence * 100)}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Match Details */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {getMatchReasonLabel(group.matchReason)}
                    </Badge>
                    {suggestion?.autoMergeable && (
                      <Badge variant="default" className="bg-green-500">
                        Safe to Auto-Merge
                      </Badge>
                    )}
                  </div>

                  {/* Field List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Fields:</p>
                    <div className="space-y-1">
                      {group.fields.map((field, idx) => (
                        <div
                          key={field.fieldId}
                          className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {idx === 0 && (
                              <Badge variant="outline" className="text-xs">
                                Primary
                              </Badge>
                            )}
                            <span className="font-mono text-xs">{field.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Page {field.page}</span>
                            <span>
                              ({Math.round(field.x)}, {Math.round(field.y)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggestion */}
                  {suggestion && (
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
                      <p className="text-blue-900 dark:text-blue-100">
                        {suggestion.suggestion}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMerge(group)}
                      className="flex-1"
                    >
                      <Merge className="mr-2 h-4 w-4" />
                      Merge Fields
                    </Button>
                    <Button
                      onClick={() => handleDismiss(group.groupId)}
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* No Results */}
      {!isDetecting && redundantGroups.length === 0 && visibleGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-sm text-muted-foreground">
              No redundant fields detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* All Dismissed */}
      {!isDetecting && redundantGroups.length > 0 && visibleGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-blue-500 mb-4" />
            <p className="text-sm text-muted-foreground">
              All redundant field groups have been handled.
            </p>
            <Button
              onClick={() => setDismissedGroups(new Set())}
              variant="outline"
              className="mt-4"
            >
              Show Dismissed Groups
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
