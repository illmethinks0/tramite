'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FileText, Maximize2, Minimize2, Undo2, Redo2, History } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { TemplateField } from '@/types/database'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface PDFMapperProps {
  pdfUrl: string
  templateId: string
  existingFields?: TemplateField[]
  onFieldsUpdate: (fields: Partial<TemplateField>[]) => void
}

interface FieldMarker {
  id: string
  x: number
  y: number
  page: number
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'date' | 'number' | 'checkbox' | 'signature'
  fontSize: number
}

// Touch gesture detection
interface TouchState {
  startDistance: number | null
  lastScale: number
  startX: number | null
  startY: number | null
}

// Command pattern for undo/redo
interface Command {
  type: 'add' | 'delete' | 'move'
  field: FieldMarker
  previousPosition?: { x: number; y: number } // For move operations
}

// Drag state for repositioning fields
interface DragState {
  isDragging: boolean
  fieldId: string | null
  startX: number
  startY: number
  originalX: number
  originalY: number
}

export function PDFMapper({ pdfUrl, templateId, existingFields = [], onFieldsUpdate }: PDFMapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [pageWidth, setPageWidth] = useState(0)
  const [pageHeight, setPageHeight] = useState(0)
  const [fields, setFields] = useState<FieldMarker[]>([])
  const [showFieldDialog, setShowFieldDialog] = useState(false)
  const [pendingCoordinates, setPendingCoordinates] = useState<{ x: number; y: number; page: number } | null>(null)
  const [editingField, setEditingField] = useState<FieldMarker | null>(null)

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'pdf' | 'fields'>('pdf')
  const [touchIndicator, setTouchIndicator] = useState<{ x: number; y: number } | null>(null)

  // Touch gesture state
  const touchTimeoutRef = useRef<NodeJS.Timeout>()
  const touchState = useRef<TouchState>({
    startDistance: null,
    lastScale: 1.5,
    startX: null,
    startY: null,
  })

  // Undo/Redo history
  const [history, setHistory] = useState<Command[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)

  // Keyboard navigation cursor
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null)
  const [keyboardMode, setKeyboardMode] = useState(false) // Activated by Tab key

  // Drag state for field repositioning
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    fieldId: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0,
  })

  // Form state for new field
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldMarker['fieldType']>('text')
  const [newFieldFontSize, setNewFieldFontSize] = useState(12)

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdfDoc = await loadingTask.promise
        setPdf(pdfDoc)
        setTotalPages(pdfDoc.numPages)
        renderPage(pdfDoc, currentPage, scale)
      } catch (error) {
        console.error('Error loading PDF:', error)
      }
    }

    loadPdf()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl])

  // Render PDF page
  const renderPage = async (pdfDoc: any, pageNum: number, scaleValue: number) => {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: scaleValue })

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = viewport.width
    canvas.height = viewport.height
    setPageWidth(viewport.width)
    setPageHeight(viewport.height)

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise
  }

  // Change page
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && pdf) {
      setCurrentPage(newPage)
      renderPage(pdf, newPage, scale)
    }
  }

  // Zoom with bounds checking
  const handleZoom = useCallback((newScale: number) => {
    const boundedScale = Math.max(0.5, Math.min(3, newScale))
    if (pdf) {
      setScale(boundedScale)
      touchState.current.lastScale = boundedScale
      renderPage(pdf, currentPage, boundedScale)
    }
  }, [pdf, currentPage])

  // Execute a command and add to history
  const executeCommand = useCallback((command: Command) => {
    let updatedFields: FieldMarker[] = []

    switch (command.type) {
      case 'add':
        updatedFields = [...fields, command.field]
        break
      case 'delete':
        updatedFields = fields.filter((f) => f.id !== command.field.id)
        break
      case 'move':
        updatedFields = fields.map((f) =>
          f.id === command.field.id ? command.field : f
        )
        break
    }

    setFields(updatedFields)

    // Add to history (remove any redo history after current index)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(command)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // Notify parent
    onFieldsUpdate(
      updatedFields.map((f) => ({
        template_id: templateId,
        field_name: f.fieldName,
        field_label: f.fieldLabel,
        field_type: f.fieldType,
        page_number: f.page,
        x_coordinate: f.x,
        y_coordinate: f.y,
        font_size: f.fontSize,
      }))
    )
  }, [fields, history, historyIndex, templateId, onFieldsUpdate])

  // Undo last action
  const handleUndo = useCallback(() => {
    if (historyIndex < 0) {
      toast.info('Nothing to undo')
      return
    }

    const command = history[historyIndex]
    let updatedFields: FieldMarker[] = []

    // Reverse the command
    switch (command.type) {
      case 'add':
        // Remove the added field
        updatedFields = fields.filter((f) => f.id !== command.field.id)
        break
      case 'delete':
        // Re-add the deleted field
        updatedFields = [...fields, command.field]
        break
      case 'move':
        // Restore previous position
        if (command.previousPosition) {
          updatedFields = fields.map((f) =>
            f.id === command.field.id
              ? { ...f, x: command.previousPosition!.x, y: command.previousPosition!.y }
              : f
          )
        }
        break
    }

    setFields(updatedFields)
    setHistoryIndex(historyIndex - 1)

    onFieldsUpdate(
      updatedFields.map((f) => ({
        template_id: templateId,
        field_name: f.fieldName,
        field_label: f.fieldLabel,
        field_type: f.fieldType,
        page_number: f.page,
        x_coordinate: f.x,
        y_coordinate: f.y,
        font_size: f.fontSize,
      }))
    )

    toast.success('Undo successful')
  }, [historyIndex, history, fields, templateId, onFieldsUpdate])

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      toast.info('Nothing to redo')
      return
    }

    const command = history[historyIndex + 1]
    let updatedFields: FieldMarker[] = []

    // Re-apply the command
    switch (command.type) {
      case 'add':
        updatedFields = [...fields, command.field]
        break
      case 'delete':
        updatedFields = fields.filter((f) => f.id !== command.field.id)
        break
      case 'move':
        updatedFields = fields.map((f) =>
          f.id === command.field.id ? command.field : f
        )
        break
    }

    setFields(updatedFields)
    setHistoryIndex(historyIndex + 1)

    onFieldsUpdate(
      updatedFields.map((f) => ({
        template_id: templateId,
        field_name: f.fieldName,
        field_label: f.fieldLabel,
        field_type: f.fieldType,
        page_number: f.page,
        x_coordinate: f.x,
        y_coordinate: f.y,
        font_size: f.fontSize,
      }))
    )

    toast.success('Redo successful')
  }, [historyIndex, history, fields, templateId, onFieldsUpdate])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Cmd/Ctrl + Shift + Z = Redo
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      }
      // Cmd/Ctrl + Y = Redo (alternative)
      else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Keyboard navigation for PDF mapper (arrow keys + Enter)
  useEffect(() => {
    const handlePDFKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if dialog is open or typing in input/textarea
      const target = e.target as HTMLElement
      const isTypingInInput = target.tagName === 'INPUT' ||
                              target.tagName === 'TEXTAREA' ||
                              target.isContentEditable

      if (showFieldDialog || isTypingInInput) {
        return
      }

      // Arrow keys move cursor
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()

        // Initialize cursor at center if not set
        if (!cursorPosition && pageWidth && pageHeight) {
          setCursorPosition({ x: pageWidth / 2, y: pageHeight / 2 })
          setKeyboardMode(true)
          return
        }

        if (!cursorPosition) return

        const step = e.shiftKey ? 20 : 5 // Shift = larger steps

        let newX = cursorPosition.x
        let newY = cursorPosition.y

        switch (e.key) {
          case 'ArrowLeft':
            newX = Math.max(0, cursorPosition.x - step)
            break
          case 'ArrowRight':
            newX = Math.min(pageWidth, cursorPosition.x + step)
            break
          case 'ArrowUp':
            newY = Math.min(pageHeight, cursorPosition.y + step) // Invert Y
            break
          case 'ArrowDown':
            newY = Math.max(0, cursorPosition.y - step) // Invert Y
            break
        }

        setCursorPosition({ x: newX, y: newY })
        setKeyboardMode(true)
      }
      // Enter key places field at cursor position
      else if (e.key === 'Enter' && cursorPosition && !showFieldDialog) {
        e.preventDefault()
        setPendingCoordinates({ x: cursorPosition.x, y: cursorPosition.y, page: currentPage })
        setShowFieldDialog(true)
        setNewFieldName('')
        setNewFieldLabel('')
        setNewFieldType('text')
        setNewFieldFontSize(12)
        toast.info('Place field with Enter key')
      }
      // Escape key clears cursor
      else if (e.key === 'Escape' && keyboardMode) {
        setCursorPosition(null)
        setKeyboardMode(false)
      }
    }

    window.addEventListener('keydown', handlePDFKeyDown)
    return () => window.removeEventListener('keydown', handlePDFKeyDown)
  }, [cursorPosition, keyboardMode, showFieldDialog, pageWidth, pageHeight, currentPage])

  // Get touch distance for pinch-zoom
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Handle touch start - detect single tap vs pinch
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single finger - prepare for tap
      const touch = e.touches[0]
      touchState.current.startX = touch.clientX
      touchState.current.startY = touch.clientY
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      e.preventDefault()
      const distance = getTouchDistance(e.touches)
      touchState.current.startDistance = distance
      touchState.current.lastScale = scale
    }
  }

  // Handle touch move - pinch zoom
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchState.current.startDistance !== null) {
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      const scaleChange = currentDistance / touchState.current.startDistance
      const newScale = touchState.current.lastScale * scaleChange
      handleZoom(newScale)
    }
  }

  // Handle touch end - detect tap (no significant move)
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0]
    const rect = overlayRef.current?.getBoundingClientRect()

    if (!rect) return

    // Check if this was a tap (not a drag or pinch)
    if (touchState.current.startX !== null && touchState.current.startY !== null) {
      const dx = Math.abs(touch.clientX - touchState.current.startX)
      const dy = Math.abs(touch.clientY - touchState.current.startY)

      // If movement is small (< 10px), treat as tap
      if (dx < 10 && dy < 10) {
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top

        // Show visual feedback
        if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current)
        setTouchIndicator({ x: touch.clientX, y: touch.clientY })
        touchTimeoutRef.current = setTimeout(() => setTouchIndicator(null), 400)

        // Convert to PDF coordinates (origin bottom-left)
        const pdfY = pageHeight - y

        setPendingCoordinates({ x, y: pdfY, page: currentPage })
        setShowFieldDialog(true)
        setNewFieldName('')
        setNewFieldLabel('')
        setNewFieldType('text')
        setNewFieldFontSize(12)
      }
    }

    // Reset touch state
    touchState.current.startDistance = null
    touchState.current.startX = null
    touchState.current.startY = null
  }

  // Click on PDF to add field (mouse/desktop)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore if touch device already handled it
    if (isMobile) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert to PDF coordinates (origin bottom-left)
    const pdfY = pageHeight - y

    setPendingCoordinates({ x, y: pdfY, page: currentPage })
    setShowFieldDialog(true)
    setNewFieldName('')
    setNewFieldLabel('')
    setNewFieldType('text')
    setNewFieldFontSize(12)
  }

  // Save new field (using command pattern)
  const handleSaveField = () => {
    if (!pendingCoordinates || !newFieldName) return

    const newField: FieldMarker = {
      id: `field-${Date.now()}`,
      x: pendingCoordinates.x,
      y: pendingCoordinates.y,
      page: pendingCoordinates.page,
      fieldName: newFieldName,
      fieldLabel: newFieldLabel || newFieldName,
      fieldType: newFieldType,
      fontSize: newFieldFontSize,
    }

    // Use command pattern for undo/redo support
    executeCommand({
      type: 'add',
      field: newField,
    })

    setShowFieldDialog(false)
    setPendingCoordinates(null)

    // Switch to fields tab on mobile after adding
    if (isMobile) {
      setActiveTab('fields')
    }

    toast.success('Field added')
  }

  // Delete field (using command pattern)
  const handleDeleteField = (fieldId: string) => {
    const fieldToDelete = fields.find((f) => f.id === fieldId)
    if (!fieldToDelete) return

    // Use command pattern for undo/redo support
    executeCommand({
      type: 'delete',
      field: fieldToDelete,
    })

    toast.success('Field deleted')
  }

  // Drag handlers for repositioning fields
  const handleFieldMouseDown = (e: React.MouseEvent, field: FieldMarker) => {
    // Don't start drag on mobile (use tap to add fields)
    if (isMobile) return

    e.stopPropagation()
    setDragState({
      isDragging: true,
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      originalX: field.x,
      originalY: field.y,
    })
  }

  const handleFieldMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.fieldId) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const deltaX = e.clientX - dragState.startX
    const deltaY = e.clientY - dragState.startY

    // Update field position in real-time (optimistic update)
    setFields((prevFields) =>
      prevFields.map((f) =>
        f.id === dragState.fieldId
          ? {
              ...f,
              x: dragState.originalX + deltaX,
              y: dragState.originalY - deltaY, // Invert Y since PDF coordinates
            }
          : f
      )
    )
  }, [dragState])

  const handleFieldMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.fieldId) return

    const field = fields.find((f) => f.id === dragState.fieldId)
    if (!field) return

    // Only create command if field actually moved
    if (field.x !== dragState.originalX || field.y !== dragState.originalY) {
      executeCommand({
        type: 'move',
        field: field,
        previousPosition: { x: dragState.originalX, y: dragState.originalY },
      })
      toast.success('Field repositioned')
    }

    setDragState({
      isDragging: false,
      fieldId: null,
      startX: 0,
      startY: 0,
      originalX: 0,
      originalY: 0,
    })
  }, [dragState, fields, executeCommand])

  // Add mouse move/up listeners for dragging
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleFieldMouseMove)
      window.addEventListener('mouseup', handleFieldMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleFieldMouseMove)
        window.removeEventListener('mouseup', handleFieldMouseUp)
      }
    }
  }, [dragState.isDragging, handleFieldMouseMove, handleFieldMouseUp])

  // Cleanup touch indicator timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current)
      }
    }
  }, [])

  // PDF Viewer Component (extracted for reuse in tabs)
  const PDFViewerContent = () => (
    <div>
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
            title={`Undo (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Z)`}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
            title={`Redo (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+Z)`}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="ml-1"
              title="View history"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
        >
          Previous
        </Button>
        <span className="text-body-sm text-foreground-muted">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
        >
          Next
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(scale - 0.25)}
            disabled={scale <= 0.5}
            className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
            aria-label="Zoom out"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <span className="text-body-sm text-foreground-muted min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(scale + 0.25)}
            disabled={scale >= 3}
            className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
            aria-label="Zoom in"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isMobile && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg text-sm text-foreground">
          <p className="font-medium mb-1">Mobile Controls:</p>
          <ul className="text-xs space-y-1 text-foreground-muted">
            <li>• Tap to place a field</li>
            <li>• Pinch with two fingers to zoom</li>
            <li>• Use undo/redo buttons</li>
          </ul>
        </div>
      )}

      {!isMobile && (
        <div className="mb-4 p-3 bg-muted border border-border rounded-lg text-sm text-foreground">
          <p className="font-medium mb-1">Keyboard Controls:</p>
          <ul className="text-xs space-y-1 text-foreground-muted grid grid-cols-2 gap-x-4">
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Arrow keys</kbd> Move cursor</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> Place field</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Cmd/Ctrl+Z</kbd> Undo</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Cmd/Ctrl+Shift+Z</kbd> Redo</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Shift+Arrows</kbd> Move faster</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd> Clear cursor</li>
          </ul>
        </div>
      )}

      {!isMobile && showHistoryPanel && history.length > 0 && (
        <div className="mb-4 p-4 bg-muted border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">History ({history.length} actions)</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryPanel(false)}
            >
              Close
            </Button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {history.map((cmd, idx) => (
              <div
                key={idx}
                className={cn(
                  "text-xs p-2 rounded",
                  idx === historyIndex ? "bg-accent/20 font-medium" : "bg-background"
                )}
              >
                {idx + 1}. {cmd.type === 'add' ? '➕ Added' : cmd.type === 'delete' ? '🗑️ Deleted' : '↔️ Moved'} field: {cmd.field.fieldLabel}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative border border-border rounded-lg overflow-auto bg-foreground-subtle/5">
        <div
          ref={overlayRef}
          className={cn(
            "relative inline-block",
            isMobile ? "cursor-pointer" : "cursor-crosshair"
          )}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas ref={canvasRef} className="block" />

          {/* Field markers - WCAG 2.5.8 AA compliant (44×44px minimum) */}
          {fields
            .filter((f) => f.page === currentPage)
            .map((field) => (
              <div
                key={field.id}
                className={cn(
                  "absolute border-2 rounded flex items-center transition-colors",
                  isMobile && "min-w-[44px] min-h-[44px]",
                  !isMobile && "cursor-move hover:border-accent-hover",
                  dragState.isDragging && dragState.fieldId === field.id
                    ? "border-accent-hover bg-accent/40 shadow-lg"
                    : "border-accent bg-accent/20"
                )}
                style={{
                  left: field.x - 5,
                  top: pageHeight - field.y - 10,
                  width: isMobile ? Math.max(44, 100) : 100,
                  height: isMobile ? Math.max(44, 20) : 20,
                  padding: isMobile ? '4px' : '0',
                  zIndex: dragState.fieldId === field.id ? 10 : 1,
                }}
                title={isMobile ? field.fieldLabel : `${field.fieldLabel} (drag to move)`}
                onMouseDown={(e) => handleFieldMouseDown(e, field)}
              >
                <span className={cn(
                  "text-accent font-semibold px-1 pointer-events-none",
                  isMobile ? "text-xs" : "text-caption"
                )}>
                  {field.fieldLabel}
                </span>
              </div>
            ))}

          {/* Keyboard navigation cursor */}
          {keyboardMode && cursorPosition && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: cursorPosition.x - 10,
                top: pageHeight - cursorPosition.y - 10,
                width: 20,
                height: 20,
              }}
            >
              {/* Crosshair cursor */}
              <div className="relative w-full h-full">
                {/* Vertical line */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-full bg-accent animate-pulse" />
                {/* Horizontal line */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-accent animate-pulse" />
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent ring-2 ring-accent/50" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Touch indicator (visual feedback) */}
      {touchIndicator && (
        <div
          className="fixed pointer-events-none z-50 rounded-full bg-accent/30 border-2 border-accent animate-ping"
          style={{
            left: touchIndicator.x - 20,
            top: touchIndicator.y - 20,
            width: 40,
            height: 40,
          }}
        />
      )}
    </div>
  )

  // Field List Component (extracted for reuse in tabs)
  const FieldListContent = () => (
    <div className={cn(
      isMobile ? "w-full" : "w-80",
      "border border-border rounded-lg p-4 bg-background-secondary"
    )}>
      <h3 className="text-h4 font-semibold text-foreground mb-4">
        Fields ({fields.length})
      </h3>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {fields.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-body-sm text-foreground-muted">
              {isMobile ? 'Tap on the PDF to add fields' : 'Click on the PDF to add fields'}
            </p>
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="border border-border rounded-lg p-3 hover:border-border-strong transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-foreground truncate">
                    {field.fieldLabel}
                  </div>
                  <div className="text-caption text-foreground-subtle truncate">
                    {field.fieldName}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteField(field.id)}
                  className={cn(isMobile && "min-w-[44px] min-h-[44px]")}
                >
                  Delete
                </Button>
              </div>
              <div className="text-caption text-foreground-muted">
                Page {field.page} • Type: {field.fieldType}
              </div>
              <div className="text-caption text-foreground-muted">
                ({Math.round(field.x)}, {Math.round(field.y)}) • {field.fontSize}px
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // Mobile layout with tabs
  if (isMobile) {
    return (
      <>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pdf' | 'fields')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pdf" className="min-h-[44px]">
              PDF Viewer
            </TabsTrigger>
            <TabsTrigger value="fields" className="min-h-[44px]">
              Fields ({fields.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pdf">
            <PDFViewerContent />
          </TabsContent>
          <TabsContent value="fields">
            <FieldListContent />
          </TabsContent>
        </Tabs>

        {/* Add Field Dialog */}
        <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Field</DialogTitle>
              <DialogDescription>
                Configure the field properties for the selected location
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fieldName">Field Name (unique)</Label>
                <Input
                  id="fieldName"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., nombre, email"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fieldLabel">Field Label (display)</Label>
                <Input
                  id="fieldLabel"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="e.g., Nombre completo"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fieldType">Field Type</Label>
                <select
                  id="fieldType"
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldMarker['fieldType'])}
                  className="mt-2 flex h-11 w-full rounded-lg border border-border bg-background-secondary px-4 py-2 text-body text-foreground"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="signature">Signature</option>
                </select>
              </div>

              <div>
                <Label htmlFor="fontSize">Font Size (px)</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={newFieldFontSize}
                  onChange={(e) => setNewFieldFontSize(parseInt(e.target.value))}
                  min={8}
                  max={72}
                  className="mt-2"
                />
              </div>

              {pendingCoordinates && (
                <div className="text-body-sm text-foreground-muted">
                  Coordinates: ({Math.round(pendingCoordinates.x)}, {Math.round(pendingCoordinates.y)})
                  on page {pendingCoordinates.page}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveField}
                  disabled={!newFieldName}
                  className="flex-1 min-h-[44px]"
                >
                  Save Field
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFieldDialog(false)}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop layout (side-by-side)
  return (
    <>
      <div className="flex gap-6">
        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewerContent />
        </div>

        {/* Field List */}
        <FieldListContent />
      </div>

      {/* Add Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field</DialogTitle>
            <DialogDescription>
              Configure the field properties for the selected location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldName">Field Name (unique)</Label>
              <Input
                id="fieldName"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g., nombre, email"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="fieldLabel">Field Label (display)</Label>
              <Input
                id="fieldLabel"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g., Nombre completo"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="fieldType">Field Type</Label>
              <select
                id="fieldType"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as FieldMarker['fieldType'])}
                className="mt-2 flex h-11 w-full rounded-lg border border-border bg-background-secondary px-4 py-2 text-body text-foreground"
              >
                <option value="text">Text</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
                <option value="checkbox">Checkbox</option>
                <option value="signature">Signature</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fontSize">Font Size (px)</Label>
              <Input
                id="fontSize"
                type="number"
                value={newFieldFontSize}
                onChange={(e) => setNewFieldFontSize(parseInt(e.target.value))}
                min={8}
                max={72}
                className="mt-2"
              />
            </div>

            {pendingCoordinates && (
              <div className="text-body-sm text-foreground-muted">
                Coordinates: ({Math.round(pendingCoordinates.x)}, {Math.round(pendingCoordinates.y)})
                on page {pendingCoordinates.page}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveField} disabled={!newFieldName}>
                Save Field
              </Button>
              <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
