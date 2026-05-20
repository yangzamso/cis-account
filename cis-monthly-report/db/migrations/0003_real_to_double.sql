-- real → double precision (float8): 정밀도 6~7자리 → 15~17자리
ALTER TABLE exchange_rates
  ALTER COLUMN rate_to_usd TYPE double precision,
  ALTER COLUMN usd_to_krw  TYPE double precision;

ALTER TABLE income_records
  ALTER COLUMN tithes           TYPE double precision,
  ALTER COLUMN sunday_offerings TYPE double precision,
  ALTER COLUMN thanksgiving     TYPE double precision,
  ALTER COLUMN center_support   TYPE double precision,
  ALTER COLUMN other_offerings  TYPE double precision,
  ALTER COLUMN building_fund    TYPE double precision,
  ALTER COLUMN hq_building_fund TYPE double precision,
  ALTER COLUMN other_income     TYPE double precision;

ALTER TABLE expense_records
  ALTER COLUMN amount_usd   TYPE double precision,
  ALTER COLUMN amount_local TYPE double precision;

ALTER TABLE tithe_reserves
  ALTER COLUMN total_offerings   TYPE double precision,
  ALTER COLUMN one_tenth         TYPE double precision,
  ALTER COLUMN prev_balance      TYPE double precision,
  ALTER COLUMN remittance_to_hq  TYPE double precision,
  ALTER COLUMN balance           TYPE double precision;

ALTER TABLE deposits
  ALTER COLUMN carried_over TYPE double precision,
  ALTER COLUMN increase     TYPE double precision,
  ALTER COLUMN decrease     TYPE double precision,
  ALTER COLUMN balance      TYPE double precision;

ALTER TABLE loans
  ALTER COLUMN carried_over      TYPE double precision,
  ALTER COLUMN monthly_borrowing TYPE double precision,
  ALTER COLUMN monthly_repayment TYPE double precision,
  ALTER COLUMN balance           TYPE double precision;

ALTER TABLE opening_balances
  ALTER COLUMN bankbook_local TYPE double precision,
  ALTER COLUMN cash_local     TYPE double precision,
  ALTER COLUMN cash_usd       TYPE double precision;

ALTER TABLE fund_transfers
  ALTER COLUMN amount_local  TYPE double precision,
  ALTER COLUMN amount_usd    TYPE double precision,
  ALTER COLUMN exchange_rate TYPE double precision;

ALTER TABLE currency_rates
  ALTER COLUMN rate_to_usd TYPE double precision,
  ALTER COLUMN usd_to_krw  TYPE double precision;
