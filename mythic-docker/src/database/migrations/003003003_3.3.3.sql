-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."operation" add column IF NOT EXISTS "banner_text" text not null default ''::text;
alter table "public"."operation" add column IF NOT EXISTS "banner_color" text not null default ''::text;
alter table "public"."callbackport" add column IF NOT EXISTS "username" text not null default ''::text;
alter table "public"."callbackport" add column IF NOT EXISTS "password" text not null default ''::text;

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


