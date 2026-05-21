-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."c2profileparameters" add column IF NOT EXISTS "form_schema" jsonb not null default '{}'::jsonb;

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back
