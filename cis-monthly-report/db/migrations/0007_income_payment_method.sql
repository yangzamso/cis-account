ALTER TABLE income_records ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank';
