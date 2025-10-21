-- Database Functions and Triggers
-- Supplementary functions for form submissions and analytics

-- Function to increment submission count
CREATE OR REPLACE FUNCTION increment_submission_count(form_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forms
  SET
    submission_count = submission_count + 1,
    updated_at = NOW()
  WHERE id = form_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update completion rate
-- Completion rate = (completed submissions / total submissions) * 100
CREATE OR REPLACE FUNCTION update_completion_rate(form_id_input UUID)
RETURNS VOID AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
  rate DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM submissions
  WHERE form_id = form_id_input;

  SELECT COUNT(*) INTO completed_count
  FROM submissions
  WHERE form_id = form_id_input AND status = 'completed';

  IF total_count > 0 THEN
    rate := (completed_count::DECIMAL / total_count::DECIMAL) * 100;
  ELSE
    rate := 0;
  END IF;

  UPDATE forms
  SET
    completion_rate = rate,
    updated_at = NOW()
  WHERE id = form_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update completion rate when submission status changes
CREATE OR REPLACE FUNCTION trigger_update_completion_rate()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_completion_rate(NEW.form_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_form_completion_rate ON submissions;
CREATE TRIGGER update_form_completion_rate
AFTER INSERT OR UPDATE OF status ON submissions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_completion_rate();

-- Function to cleanup expired drafts (run daily via cron or scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM submissions
  WHERE
    status = 'draft' AND
    draft_expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old analytics events (GDPR compliance - keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get form analytics summary
CREATE OR REPLACE FUNCTION get_form_analytics(
  form_id_input UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_views BIGINT,
  total_starts BIGINT,
  total_submissions BIGINT,
  total_abandons BIGINT,
  conversion_rate DECIMAL(5,2),
  avg_time_to_complete INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM analytics_events
     WHERE form_id = form_id_input
     AND event_type = 'form_view'
     AND created_at BETWEEN start_date AND end_date) AS total_views,

    (SELECT COUNT(*) FROM analytics_events
     WHERE form_id = form_id_input
     AND event_type = 'form_start'
     AND created_at BETWEEN start_date AND end_date) AS total_starts,

    (SELECT COUNT(*) FROM analytics_events
     WHERE form_id = form_id_input
     AND event_type = 'form_submit'
     AND created_at BETWEEN start_date AND end_date) AS total_submissions,

    (SELECT COUNT(*) FROM analytics_events
     WHERE form_id = form_id_input
     AND event_type = 'form_abandon'
     AND created_at BETWEEN start_date AND end_date) AS total_abandons,

    CASE
      WHEN (SELECT COUNT(*) FROM analytics_events
            WHERE form_id = form_id_input
            AND event_type = 'form_view'
            AND created_at BETWEEN start_date AND end_date) > 0
      THEN (
        (SELECT COUNT(*) FROM analytics_events
         WHERE form_id = form_id_input
         AND event_type = 'form_submit'
         AND created_at BETWEEN start_date AND end_date)::DECIMAL
        /
        (SELECT COUNT(*) FROM analytics_events
         WHERE form_id = form_id_input
         AND event_type = 'form_view'
         AND created_at BETWEEN start_date AND end_date)::DECIMAL
      ) * 100
      ELSE 0
    END AS conversion_rate,

    (SELECT AVG(submitted_at - created_at) FROM submissions
     WHERE form_id = form_id_input
     AND status = 'completed'
     AND created_at BETWEEN start_date AND end_date) AS avg_time_to_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_draft_token ON submissions(draft_token);
CREATE INDEX IF NOT EXISTS idx_submissions_draft_expires_at ON submissions(draft_expires_at);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_submission_id ON email_deliveries(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON email_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_form_id ON analytics_events(form_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_completion_rate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Service role can execute cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_expired_drafts() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics() TO service_role;

COMMENT ON FUNCTION increment_submission_count IS 'Increments the submission count for a form';
COMMENT ON FUNCTION update_completion_rate IS 'Calculates and updates the completion rate for a form';
COMMENT ON FUNCTION cleanup_expired_drafts IS 'Deletes draft submissions that have expired (run daily)';
COMMENT ON FUNCTION cleanup_old_analytics IS 'Deletes analytics events older than 90 days (GDPR compliance)';
COMMENT ON FUNCTION get_form_analytics IS 'Returns analytics summary for a form within a date range';
