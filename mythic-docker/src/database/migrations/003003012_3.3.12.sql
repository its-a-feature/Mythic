-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."task" add column IF NOT EXISTS "mythic_parsed_params" text not null default ''::text;
create sequence IF NOT EXISTS "public"."global_setting_id_seq";
create sequence IF NOT EXISTS "public"."invite_link_id_seq";
create table IF NOT EXISTS "public"."global_setting" (
   "id" integer not null default nextval('global_setting_id_seq'::regclass),
   "name" text not null,
   "setting" jsonb not null default jsonb_build_object(),
   "operator_id" integer
);
create table IF NOT EXISTS "public"."invite_link" (
    "id" integer not null default nextval('invite_link_id_seq'::regclass),
    "operation_id" integer,
    "operation_role" text,
    "total_uses" integer not null default 1,
    "name" text not null,
    "short_code" text not null,
    "operator_id" integer not null,
    "total_used" integer not null,
    "created_at" timestamp with time zone not null default now()
);
alter table "public"."payloadtype" drop column IF EXISTS "version";
alter table "public"."payloadtype" add column IF NOT EXISTS "semver" text not null default ''::text;
alter sequence IF EXISTS "public"."global_setting_id_seq" owned by "public"."global_setting"."id";
alter sequence IF EXISTS "public"."invite_link_id_seq" owned by "public"."invite_link"."id";

alter table "public"."global_setting" drop constraint if exists "global_setting_pkey";
CREATE UNIQUE INDEX IF NOT EXISTS global_setting_pkey ON "public"."global_setting" USING btree (id);
alter table "public"."global_setting" add constraint "global_setting_pkey" PRIMARY KEY using index "global_setting_pkey";

alter table "public"."invite_link" drop constraint if exists "invite_link_pkey";
CREATE UNIQUE INDEX IF NOT EXISTS invite_link_pkey ON "public"."invite_link" USING btree (id);
alter table "public"."invite_link" add constraint "invite_link_pkey" PRIMARY KEY using index "invite_link_pkey";

alter table "public"."global_setting" drop constraint if exists "global_setting_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS global_setting_name_key ON "public"."global_setting" USING btree (name);
alter table "public"."global_setting" add constraint "global_setting_name_key" UNIQUE using index "global_setting_name_key";

alter table "public"."global_setting" drop constraint if exists "global_setting_operator_id_fkey";
alter table "public"."global_setting" add constraint "global_setting_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) not valid;
alter table "public"."global_setting" validate constraint "global_setting_operator_id_fkey";

alter table "public"."invite_link" drop constraint if exists "invite_link_operation_id_fkey";
alter table "public"."invite_link" add constraint "invite_link_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."invite_link" validate constraint "invite_link_operation_id_fkey";

alter table "public"."invite_link" drop constraint if exists "invite_link_operator_id_fkey";
alter table "public"."invite_link" add constraint "invite_link_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."invite_link" validate constraint "invite_link_operator_id_fkey";

alter table "public"."invite_link" drop constraint if exists "invite_link_short_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS invite_link_short_code_key ON "public"."invite_link" USING btree (short_code);
alter table "public"."invite_link" add constraint "invite_link_short_code_key" UNIQUE using index "invite_link_short_code_key";

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
DECLARE
    _new record;
BEGIN
    _new := NEW;
    _new."updated_at" = NOW();
    RETURN _new;
END;
$function$
;

-- +migrate StatementEnd
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


