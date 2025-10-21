-- Migration 002: Forms and Submissions System
-- Adds complete document automation workflow support

-- ============================================================================
-- 1. FORMS TABLE
-- ============================================================================
-- Stores generated web forms from templates
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Form identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE, -- URL-friendly identifier (forms/[slug])

  -- Form configuration
  is_published BOOLEAN DEFAULT false,
  is_accepting_responses BOOLEAN DEFAULT true,
  max_submissions INTEGER, -- NULL = unlimited
  expires_at TIMESTAMPTZ,

  -- Branding & customization
  branding JSONB DEFAULT '{}'::jsonb, -- { logo, primaryColor, font, etc. }
  settings JSONB DEFAULT '{}'::jsonb, -- { requireAuth, captcha, saveProgress, etc. }

  -- Conditional logic
  conditional_rules JSONB DEFAULT '[]'::jsonb, -- Array of show/hide rules

  -- Delivery configuration
  email_config JSONB DEFAULT '{}'::jsonb, -- { recipients, subject, template }

  -- Notifications
  notification_config JSONB DEFAULT '{}'::jsonb, -- { onSubmit, onComplete, etc. }

  -- Analytics
  view_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2), -- Percentage

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_completion_rate CHECK (completion_rate >= 0 AND completion_rate <= 100)
);

-- Indexes for forms
CREATE INDEX idx_forms_organization ON forms(organization_id);
CREATE INDEX idx_forms_template ON forms(template_id);
CREATE INDEX idx_forms_slug ON forms(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_forms_published ON forms(is_published, is_accepting_responses);
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);

-- ============================================================================
-- 2. FORM_FIELDS TABLE
-- ============================================================================
-- Stores field configuration for each form (extends template_fields)
CREATE TABLE IF NOT EXISTS form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  template_field_id UUID NOT NULL REFERENCES template_fields(id),

  -- Field configuration (can override template defaults)
  display_order INTEGER NOT NULL DEFAULT 0,
  field_group VARCHAR(100), -- Group related fields (e.g., "personal_info", "address")

  -- Validation
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}'::jsonb, -- { min, max, pattern, custom }
  error_messages JSONB DEFAULT '{}'::jsonb, -- { required, pattern, min, max }

  -- UI customization
  label VARCHAR(255),
  placeholder VARCHAR(255),
  help_text TEXT,
  default_value TEXT,

  -- Conditional display
  conditional_visibility JSONB, -- { showIf: [{ field: "country", equals: "DE" }] }

  -- Field-specific settings
  options JSONB, -- For select/radio/checkbox (array of { value, label })
  file_config JSONB, -- For file uploads { maxSize, acceptedTypes }

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(form_id, template_field_id)
);

-- Indexes for form_fields
CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_form_fields_template_field ON form_fields(template_field_id);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, display_order);

-- ============================================================================
-- 3. SUBMISSIONS TABLE
-- ============================================================================
-- Stores form submissions from end users
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Submitter information
  submitter_email VARCHAR(255),
  submitter_name VARCHAR(255),
  submitter_ip INET, -- IP address for fraud detection
  user_agent TEXT, -- Browser/device info

  -- Submission data
  form_data JSONB NOT NULL, -- { fieldName: value }
  files JSONB DEFAULT '[]'::jsonb, -- Uploaded files metadata

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed')),

  -- Generated documents
  generated_pdf_id UUID REFERENCES generated_pdfs(id),
  generated_pdf_url TEXT,

  -- Email delivery
  email_sent_at TIMESTAMPTZ,
  email_status VARCHAR(50), -- 'queued', 'sent', 'failed', 'bounced'
  email_error TEXT,

  -- Progress tracking (for save & resume)
  is_draft BOOLEAN DEFAULT false,
  draft_token VARCHAR(255) UNIQUE, -- Resumption token
  draft_expires_at TIMESTAMPTZ,

  -- Analytics
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_to_complete INTEGER, -- Seconds

  -- GDPR compliance
  consent_given BOOLEAN DEFAULT false,
  consent_ip INET,
  consent_timestamp TIMESTAMPTZ,
  data_retention_until TIMESTAMPTZ, -- Auto-delete after this date

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT draft_or_submitted CHECK (
    (is_draft = true AND submitted_at IS NULL) OR
    (is_draft = false AND submitted_at IS NOT NULL)
  )
);

-- Indexes for submissions
CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_organization ON submissions(organization_id);
CREATE INDEX idx_submissions_email ON submissions(submitter_email);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_draft_token ON submissions(draft_token) WHERE draft_token IS NOT NULL;
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_retention ON submissions(data_retention_until) WHERE data_retention_until IS NOT NULL;

-- ============================================================================
-- 4. EMAIL_DELIVERIES TABLE
-- ============================================================================
-- Tracks email notifications sent from the system
CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_type VARCHAR(50) CHECK (recipient_type IN ('submitter', 'owner', 'third_party')),

  -- Email content
  subject VARCHAR(500) NOT NULL,
  body_text TEXT,
  body_html TEXT,

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb, -- [{ filename, url, size }]

  -- Delivery tracking
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'bounced', 'complained')),
  provider VARCHAR(50), -- 'resend', 'sendgrid', etc.
  provider_message_id VARCHAR(255),

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ, -- Email open tracking
  clicked_at TIMESTAMPTZ, -- Link click tracking

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_deliveries
CREATE INDEX idx_email_deliveries_submission ON email_deliveries(submission_id);
CREATE INDEX idx_email_deliveries_organization ON email_deliveries(organization_id);
CREATE INDEX idx_email_deliveries_status ON email_deliveries(status);
CREATE INDEX idx_email_deliveries_recipient ON email_deliveries(recipient_email);
CREATE INDEX idx_email_deliveries_created_at ON email_deliveries(created_at DESC);

-- ============================================================================
-- 5. ANALYTICS_EVENTS TABLE
-- ============================================================================
-- Lightweight analytics for form performance
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
    'form_view', 'form_start', 'form_submit', 'form_abandon',
    'field_focus', 'field_blur', 'validation_error', 'email_sent'
  )),

  -- Event data
  event_data JSONB DEFAULT '{}'::jsonb, -- { field, error, step, etc. }

  -- Session tracking
  session_id VARCHAR(255), -- Anonymous session ID
  visitor_id VARCHAR(255), -- Persistent visitor ID (cookie)

  -- Context
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),

  -- Device/browser
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Location (privacy-safe: country/city only)
  country_code CHAR(2),
  city VARCHAR(100),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_events
CREATE INDEX idx_analytics_form ON analytics_events(form_id, event_type);
CREATE INDEX idx_analytics_organization ON analytics_events(organization_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- Partitioning hint for future optimization
COMMENT ON TABLE analytics_events IS 'Consider partitioning by created_at (monthly) for large datasets';

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Forms RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their own forms"
  ON forms FOR SELECT
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "Organizations can create forms"
  ON forms FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "Organizations can update their forms"
  ON forms FOR UPDATE
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "Organizations can delete their forms"
  ON forms FOR DELETE
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Public access to published forms (for form viewing)
CREATE POLICY "Anyone can view published forms"
  ON forms FOR SELECT
  USING (is_published = true);

-- Form Fields RLS
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can manage their form fields"
  ON form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_fields.form_id
      AND forms.organization_id = current_setting('app.current_org_id', true)::uuid
    )
  );

CREATE POLICY "Anyone can view fields for published forms"
  ON form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_fields.form_id
      AND forms.is_published = true
    )
  );

-- Submissions RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their submissions"
  ON submissions FOR SELECT
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "Organizations can update their submissions"
  ON submissions FOR UPDATE
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Public can create submissions (anonymous form submission)
CREATE POLICY "Anyone can submit forms"
  ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = submissions.form_id
      AND forms.is_published = true
      AND forms.is_accepting_responses = true
    )
  );

-- Email Deliveries RLS
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their email deliveries"
  ON email_deliveries FOR SELECT
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Analytics Events RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their analytics"
  ON analytics_events FOR SELECT
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Public can create analytics events (anonymous tracking)
CREATE POLICY "Anyone can track form events"
  ON analytics_events FOR INSERT
  WITH CHECK (
    form_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = analytics_events.form_id
      AND forms.is_published = true
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON form_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_deliveries_updated_at
  BEFORE UPDATE ON email_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment submission count on forms
CREATE OR REPLACE FUNCTION increment_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE forms
    SET submission_count = submission_count + 1
    WHERE id = NEW.form_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_submission_count_trigger
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION increment_form_submission_count();

-- Calculate completion rate for forms
CREATE OR REPLACE FUNCTION update_form_completion_rate()
RETURNS TRIGGER AS $$
DECLARE
  total_starts INTEGER;
  total_completes INTEGER;
  rate DECIMAL(5,2);
BEGIN
  -- Count form starts (any event)
  SELECT COUNT(DISTINCT session_id) INTO total_starts
  FROM analytics_events
  WHERE form_id = NEW.form_id
  AND event_type IN ('form_view', 'form_start');

  -- Count completions
  SELECT submission_count INTO total_completes
  FROM forms
  WHERE id = NEW.form_id;

  -- Calculate rate
  IF total_starts > 0 THEN
    rate := (total_completes::DECIMAL / total_starts::DECIMAL) * 100;

    UPDATE forms
    SET completion_rate = rate
    WHERE id = NEW.form_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_completion_rate_trigger
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_form_completion_rate();

-- Auto-generate form slug from name
CREATE OR REPLACE FUNCTION generate_form_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM forms WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_slug_trigger
  BEFORE INSERT OR UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION generate_form_slug();

-- ============================================================================
-- DATA RETENTION FUNCTIONS
-- ============================================================================

-- Auto-delete expired draft submissions
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM submissions
  WHERE is_draft = true
  AND draft_expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Auto-delete submissions past retention period (GDPR)
CREATE OR REPLACE FUNCTION cleanup_expired_submissions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM submissions
  WHERE data_retention_until IS NOT NULL
  AND data_retention_until < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup jobs (requires pg_cron extension)
-- Run daily at 2 AM
-- SELECT cron.schedule('cleanup-drafts', '0 2 * * *', 'SELECT cleanup_expired_drafts()');
-- SELECT cron.schedule('cleanup-gdpr', '0 3 * * *', 'SELECT cleanup_expired_submissions()');

COMMENT ON FUNCTION cleanup_expired_drafts IS 'Removes draft submissions older than 7 days';
COMMENT ON FUNCTION cleanup_expired_submissions IS 'Removes submissions past GDPR retention period';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE forms IS 'Generated web forms from templates - the core of the automation workflow';
COMMENT ON TABLE form_fields IS 'Field configuration for forms - extends template_fields with display and validation settings';
COMMENT ON TABLE submissions IS 'Form submissions from end users - stores form data and tracks status';
COMMENT ON TABLE email_deliveries IS 'Email notification tracking - audit trail for all sent emails';
COMMENT ON TABLE analytics_events IS 'Lightweight analytics for form performance - views, starts, completions, abandonments';

COMMENT ON COLUMN forms.slug IS 'URL-friendly identifier for public form access (e.g., /forms/job-application-2024)';
COMMENT ON COLUMN forms.conditional_rules IS 'Show/hide rules: [{ field: "country", operator: "equals", value: "DE", showFields: ["germanFields"] }]';
COMMENT ON COLUMN form_fields.conditional_visibility IS 'When to show this field: { showIf: [{ field: "country", equals: "DE" }] }';
COMMENT ON COLUMN submissions.draft_token IS 'Secure token for resuming draft submissions - emailed to user';
COMMENT ON COLUMN submissions.consent_given IS 'GDPR consent checkbox - required before form submission';
COMMENT ON COLUMN analytics_events.visitor_id IS 'Persistent cookie ID (GDPR-compliant, no PII)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users (via Supabase Auth)
GRANT SELECT, INSERT, UPDATE ON forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON form_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON submissions TO authenticated;
GRANT SELECT ON email_deliveries TO authenticated;
GRANT SELECT ON analytics_events TO authenticated;

-- Grant public access for form submissions
GRANT SELECT ON forms TO anon;
GRANT SELECT ON form_fields TO anon;
GRANT INSERT ON submissions TO anon;
GRANT INSERT ON analytics_events TO anon;

-- ============================================================================
-- SAMPLE DATA (Optional - for development/testing)
-- ============================================================================

-- Uncomment to insert sample data:
/*
INSERT INTO forms (organization_id, template_id, created_by, name, description, is_published)
VALUES (
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM templates LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'Sample Job Application Form',
  'Test form for job applications',
  true
);
*/
