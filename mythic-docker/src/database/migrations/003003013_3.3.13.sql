-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."buildparameter" add column IF NOT EXISTS "group_name" text not null default ''::text;
alter table "public"."buildparameter" add column IF NOT EXISTS "supported_os" jsonb not null default jsonb_build_array();
alter table "public"."buildparameter" add column IF NOT EXISTS "hide_conditions" jsonb not null default jsonb_build_array();
alter table "public"."payloadtype" add column IF NOT EXISTS "c2_parameter_deviations" jsonb not null default jsonb_build_object();
alter table "public"."payloadtype" add column IF NOT EXISTS "supported_c2" jsonb not null default jsonb_build_array();
alter table "public"."payloadtype" add column IF NOT EXISTS "semver" text not null default ''::text;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


