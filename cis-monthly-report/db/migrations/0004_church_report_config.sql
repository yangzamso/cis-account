CREATE TABLE church_report_config (
  id serial PRIMARY KEY,
  church_id integer NOT NULL UNIQUE REFERENCES churches(id) ON DELETE CASCADE,
  approval_limit double precision NOT NULL DEFAULT 0,
  withdrawer1 text NOT NULL DEFAULT '',
  withdrawer2 text NOT NULL DEFAULT '',
  financial_source text NOT NULL DEFAULT '',
  checking_status text NOT NULL DEFAULT '',
  feedback text NOT NULL DEFAULT ''
);
