ALTER TABLE churches ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'ko';
