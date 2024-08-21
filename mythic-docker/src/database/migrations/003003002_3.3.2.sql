-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."commandparameters" add column IF NOT EXISTS "limit_credentials_by_type" jsonb not null default jsonb_build_array();

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


