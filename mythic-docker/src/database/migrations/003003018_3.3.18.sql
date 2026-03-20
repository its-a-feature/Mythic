-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

alter table "public"."filemeta" add column IF NOT EXISTS "received_chunk_ids" jsonb not null default jsonb_build_object();

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


