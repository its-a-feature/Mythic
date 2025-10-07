-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."buildparameter" add column IF NOT EXISTS "group_name" text not null default ''::text;
alter table "public"."buildparameter" add column IF NOT EXISTS "supported_os" jsonb not null default jsonb_build_array();
alter table "public"."buildparameter" add column IF NOT EXISTS "hide_conditions" jsonb not null default jsonb_build_array();
alter table "public"."payloadtype" add column IF NOT EXISTS "c2_parameter_deviations" jsonb not null default jsonb_build_object();
alter table "public"."payloadtype" add column IF NOT EXISTS "supported_c2" jsonb not null default jsonb_build_array();
alter table "public"."payloadtype" add column IF NOT EXISTS "semver" text not null default ''::text;
alter table "public"."payloadtype" add column IF NOT EXISTS "command_help_function" text not null default ''::text;
alter table "public"."c2profileparametersinstance" add column IF NOT EXISTS "count" integer not null default 0;
alter table "public"."c2profile" add column IF NOT EXISTS "semver" text not null default ''::text;
alter table "public"."c2profile" add column IF NOT EXISTS "has_logo" boolean not null default false;
alter table "public"."consuming_container" add column IF NOT EXISTS "semver" text not null default ''::text;
alter table "public"."operationeventlog" add column IF NOT EXISTS "warning" boolean not null default false;
drop index if exists "public"."c2profileparametersinstance_c2_profile_parameters_id_ins_93bb57";
drop index if exists "public"."c2profileparametersinstance_c2_profile_parameters_id_payload_id";

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.update_operation_alert_count() RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    current_max integer;
BEGIN
    SELECT COUNT(*)
    INTO current_max
    FROM operationeventlog
    WHERE operation_id = NEW.operation_id AND resolved=false AND deleted=false AND warning=true;

    UPDATE operation SET alert_count = current_max WHERE id = NEW.operation_id;
    RETURN NEW;
END;
$$;

-- +migrate StatementEnd

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


