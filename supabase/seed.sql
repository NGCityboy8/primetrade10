-- Run after 001_schema.sql (matches js/auth-store.js DEFAULT_PLANS)
INSERT INTO investment_plans (slug, name, min_deposit, max_deposit, duration_days) VALUES
  ('starter', 'Starter', 500, 4999, 30),
  ('growth', 'Growth', 5000, 24999, 60),
  ('premium', 'Premium', 25000, 99999, 90),
  ('elite', 'Elite', 100000, 500000, 180)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  min_deposit = EXCLUDED.min_deposit,
  max_deposit = EXCLUDED.max_deposit,
  duration_days = EXCLUDED.duration_days;
