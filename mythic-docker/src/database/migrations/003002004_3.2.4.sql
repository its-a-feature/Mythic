-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."callbackport" add column if not exists "bytes_received" integer not null default 0;
alter table "public"."callbackport" add column if not exists "bytes_sent" integer not null default 0;
alter table "public"."filemeta" add column if not exists "size" integer not null default 0;

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


