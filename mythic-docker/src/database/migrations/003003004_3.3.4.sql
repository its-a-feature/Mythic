-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."payloadtype" add column IF NOT EXISTS "use_display_params_for_cli_history" boolean not null default false;

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


