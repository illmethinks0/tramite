-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  monthly_pdf_limit INTEGER DEFAULT 100,
  storage_limit_mb INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  pdf_url TEXT NOT NULL,
  pdf_pages INTEGER NOT NULL DEFAULT 1,
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Template fields table
CREATE TABLE template_fields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255),
  field_type VARCHAR(50) DEFAULT 'text' CHECK (field_type IN ('text', 'date', 'number', 'checkbox', 'signature')),
  page_number INTEGER NOT NULL DEFAULT 1,
  x_coordinate DECIMAL(10, 2) NOT NULL,
  y_coordinate DECIMAL(10, 2) NOT NULL,
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  font_size INTEGER DEFAULT 12,
  font_family VARCHAR(100) DEFAULT 'Helvetica',
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_regex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, field_name)
);

-- Generated PDFs audit table
CREATE TABLE generated_pdfs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id),
  pdf_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  fields_filled INTEGER,
  processing_time_ms INTEGER,
  status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'processing')),
  error_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_templates_org ON templates(organization_id);
CREATE INDEX idx_template_fields_template ON template_fields(template_id);
CREATE INDEX idx_generated_pdfs_org ON generated_pdfs(organization_id);
CREATE INDEX idx_generated_pdfs_expires ON generated_pdfs(expires_at);

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pdfs ENABLE ROW LEVEL SECURITY;

-- Organization policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their organization if admin/owner" ON organizations
  FOR UPDATE USING (id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- User profile policies
CREATE POLICY "Users can view their profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Template access policies
CREATE POLICY "Users can view their org templates or public templates" ON templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ) OR is_public = true
  );

CREATE POLICY "Users can create templates in their org" ON templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org templates" ON templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete their org templates" ON templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Template fields policies
CREATE POLICY "Users can view fields of accessible templates" ON template_fields
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM templates WHERE
        organization_id IN (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        ) OR is_public = true
    )
  );

CREATE POLICY "Users can manage fields of their templates" ON template_fields
  FOR ALL USING (
    template_id IN (
      SELECT id FROM templates WHERE
        organization_id IN (
          SELECT organization_id FROM user_profiles
          WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    )
  );

-- Generated PDFs policies
CREATE POLICY "Users can view their org generated PDFs" ON generated_pdfs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated PDFs" ON generated_pdfs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Function to auto-create organization and profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.id::text), ' ', '-'))
  )
  RETURNING id INTO NEW.raw_user_meta_data;

  -- Create user profile
  INSERT INTO user_profiles (id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'id')::uuid,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create organization and profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload PDFs to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdfs' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view PDFs from their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdfs' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    ) OR
    (storage.foldername(name))[1] = 'public'
  )
);
