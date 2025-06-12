-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."callback" add column IF NOT EXISTS "impersonation_context" text not null default ''::text;
alter table "public"."callback" add column IF NOT EXISTS "cwd" text not null default ''::text;
alter table "public"."task" add column IF NOT EXISTS "command_payload_type" text not null default ''::text;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


