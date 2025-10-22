import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    })
  },

  error: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: 6000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    })
  },

  loading: (message: string) => {
    return sonnerToast.loading(message)
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    })
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },
}
