CREATE TABLE IF NOT EXISTS "receipts" (
  "id" serial PRIMARY KEY NOT NULL,
  "expense_record_id" integer NOT NULL REFERENCES "expense_records"("id") ON DELETE CASCADE,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "data" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
