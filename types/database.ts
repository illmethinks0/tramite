export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          stripe_customer_id: string | null
          plan: 'free' | 'starter' | 'pro' | 'enterprise'
          monthly_pdf_limit: number
          storage_limit_mb: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          stripe_customer_id?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'enterprise'
          monthly_pdf_limit?: number
          storage_limit_mb?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'enterprise'
          monthly_pdf_limit?: number
          storage_limit_mb?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          category: string | null
          pdf_url: string
          pdf_pages: number
          is_public: boolean
          is_archived: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          category?: string | null
          pdf_url: string
          pdf_pages?: number
          is_public?: boolean
          is_archived?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          category?: string | null
          pdf_url?: string
          pdf_pages?: number
          is_public?: boolean
          is_archived?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      template_fields: {
        Row: {
          id: string
          template_id: string
          field_name: string
          field_label: string | null
          field_type: 'text' | 'date' | 'number' | 'checkbox' | 'signature'
          page_number: number
          x_coordinate: number
          y_coordinate: number
          width: number | null
          height: number | null
          font_size: number
          font_family: string
          is_required: boolean
          default_value: string | null
          validation_regex: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          field_name: string
          field_label?: string | null
          field_type?: 'text' | 'date' | 'number' | 'checkbox' | 'signature'
          page_number?: number
          x_coordinate: number
          y_coordinate: number
          width?: number | null
          height?: number | null
          font_size?: number
          font_family?: string
          is_required?: boolean
          default_value?: string | null
          validation_regex?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          field_name?: string
          field_label?: string | null
          field_type?: 'text' | 'date' | 'number' | 'checkbox' | 'signature'
          page_number?: number
          x_coordinate?: number
          y_coordinate?: number
          width?: number | null
          height?: number | null
          font_size?: number
          font_family?: string
          is_required?: boolean
          default_value?: string | null
          validation_regex?: string | null
          created_at?: string
        }
      }
      generated_pdfs: {
        Row: {
          id: string
          organization_id: string
          template_id: string | null
          user_id: string
          pdf_url: string
          file_size_bytes: number | null
          fields_filled: number | null
          processing_time_ms: number | null
          status: 'success' | 'failed' | 'processing'
          error_message: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          template_id?: string | null
          user_id: string
          pdf_url: string
          file_size_bytes?: number | null
          fields_filled?: number | null
          processing_time_ms?: number | null
          status?: 'success' | 'failed' | 'processing'
          error_message?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          template_id?: string | null
          user_id?: string
          pdf_url?: string
          file_size_bytes?: number | null
          fields_filled?: number | null
          processing_time_ms?: number | null
          status?: 'success' | 'failed' | 'processing'
          error_message?: string | null
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}

export type TemplateField = Database['public']['Tables']['template_fields']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type GeneratedPDF = Database['public']['Tables']['generated_pdfs']['Row']
