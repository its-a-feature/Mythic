-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."task" add column IF NOT EXISTS "process_at_original_command" boolean not null default true;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


