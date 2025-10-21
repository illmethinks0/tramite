'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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

  // Form state for new field
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldMarker['fieldType']>('text')
  const [newFieldFontSize, setNewFieldFontSize] = useState(12)

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

  // Zoom
  const handleZoom = (newScale: number) => {
    if (newScale >= 0.5 && newScale <= 3 && pdf) {
      setScale(newScale)
      renderPage(pdf, currentPage, newScale)
    }
  }

  // Click on PDF to add field
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

  // Save new field
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

    const updatedFields = [...fields, newField]
    setFields(updatedFields)
    setShowFieldDialog(false)
    setPendingCoordinates(null)

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
  }

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = fields.filter((f) => f.id !== fieldId)
    setFields(updatedFields)
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
  }

  return (
    <div className="flex gap-6">
      {/* PDF Viewer */}
      <div className="flex-1">
        <div className="mb-4 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
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
          >
            Next
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(scale - 0.25)}
              disabled={scale <= 0.5}
            >
              -
            </Button>
            <span className="text-body-sm text-foreground-muted w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(scale + 0.25)}
              disabled={scale >= 3}
            >
              +
            </Button>
          </div>
        </div>

        <div className="relative border border-border rounded-lg overflow-auto bg-foreground-subtle/5">
          <div
            ref={overlayRef}
            className="relative inline-block cursor-crosshair"
            onClick={handleCanvasClick}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Field markers */}
            {fields
              .filter((f) => f.page === currentPage)
              .map((field) => (
                <div
                  key={field.id}
                  className="absolute border-2 border-accent bg-accent/20 rounded"
                  style={{
                    left: field.x - 5,
                    top: pageHeight - field.y - 10,
                    width: 100,
                    height: 20,
                  }}
                  title={field.fieldLabel}
                >
                  <span className="text-caption text-accent font-semibold px-1">
                    {field.fieldLabel}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Field List */}
      <div className="w-80 border border-border rounded-lg p-4 bg-background-secondary">
        <h3 className="text-h4 font-semibold text-foreground mb-4">
          Fields ({fields.length})
        </h3>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {fields.length === 0 ? (
            <p className="text-body-sm text-foreground-muted text-center py-8">
              Click on the PDF to add fields
            </p>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                className="border border-border rounded-lg p-3 hover:border-border-strong transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-body-sm font-medium text-foreground">
                      {field.fieldLabel}
                    </div>
                    <div className="text-caption text-foreground-subtle">
                      {field.fieldName}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    Delete
                  </Button>
                </div>
                <div className="text-caption text-foreground-muted">
                  Page {field.page} • ({Math.round(field.x)}, {Math.round(field.y)}) • {field.fontSize}px
                </div>
                <div className="text-caption text-foreground-muted">
                  Type: {field.fieldType}
                </div>
              </div>
            ))
          )}
        </div>
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
    </div>
  )
}
