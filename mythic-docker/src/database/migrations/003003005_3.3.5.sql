-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."callback" add column IF NOT EXISTS "color" text not null default ''::text;
alter table "public"."callback" add column IF NOT EXISTS "trigger_on_checkin_after_time" integer not null default 0;
alter table "public"."payloadtype" add column IF NOT EXISTS "version" integer not null default 1;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


