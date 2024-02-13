-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."operator" add column if not exists "preferences" jsonb default jsonb_build_object() not null;
alter table "public"."operator" add column if not exists "secrets" jsonb default jsonb_build_object() not null;
alter table "public"."payloadtype" add column if not exists "message_format" text default 'json'::text not null;
alter table "public"."callbackport" alter column "bytes_received" set data type bigint using "bytes_received"::bigint;
alter table "public"."callbackport" alter column "bytes_sent" set data type bigint using "bytes_sent"::bigint;

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


