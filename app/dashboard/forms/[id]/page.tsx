import { FormBuilder } from '@/components/forms/form-builder'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function FormEditorPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto py-8">
      <FormBuilder formId={id} />
    </div>
  )
}
