-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

alter table "public"."apitokens" add column IF NOT EXISTS "scopes" text[] not null default '{}'::text[];

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back