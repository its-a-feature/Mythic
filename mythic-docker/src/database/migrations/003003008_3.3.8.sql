-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."payload" add column IF NOT EXISTS "callback_allowed" boolean not null default true;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


