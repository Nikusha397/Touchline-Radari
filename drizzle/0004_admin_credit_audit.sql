-- Keep abuse-counter cleanup bounded as request volume grows.
CREATE INDEX IF NOT EXISTS rate_limits_reset ON rate_limits(reset_at);
