-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
create sequence IF NOT EXISTS "public"."custombrowser_id_seq";
create table IF NOT EXISTS "public"."custombrowser" (
  "id" integer not null default nextval('custombrowser_id_seq'::regclass),
  "name" text not null,
  "type" text not null default 'file'::text,
  "separator" text not null default '/'::text,
  "deleted" boolean not null default false,
  "columns" jsonb not null default jsonb_build_array(),
  "default_visible_columns" jsonb not null default jsonb_build_array(),
  "export_function" text not null default ''::text,
  "indicate_partial_listing" boolean not null default true,
  "show_current_path" boolean not null default true,
  "row_actions" jsonb not null default jsonb_build_array(),
  "extra_table_inputs" jsonb not null default jsonb_build_array(),
  "author" text not null default ''::text,
  "description" text not null default ''::text,
  "container_running" boolean not null default false,
  "semver" text not null default ''::text
);

alter table "public"."commandparameters" add column IF NOT EXISTS "verifier_regex" text not null default ''::text;
alter table "public"."mythictree" add column IF NOT EXISTS "display_path" bytea not null default '\x'::bytea;
alter table "public"."mythictree" add column IF NOT EXISTS "has_children" boolean not null default false;
alter table "public"."payload" add column IF NOT EXISTS "payload_type_semver" text not null default ''::text;
alter table "public"."payloadtype" add column IF NOT EXISTS "supported_wrapping" jsonb not null default jsonb_build_array();
alter table "public"."token" alter column "token_id" set data type bigint using "token_id"::bigint;

alter sequence "public"."custombrowser_id_seq" owned by "public"."custombrowser"."id";
alter table "public"."custombrowser" drop constraint if exists "custombrowser_pkey";
alter table "public"."custombrowser" drop constraint if exists "custombrowser_name_key";
CREATE UNIQUE INDEX custombrowser_name_key ON public.custombrowser USING btree (name);
CREATE UNIQUE INDEX custombrowser_pkey ON public.custombrowser USING btree (id);
alter table "public"."custombrowser" add constraint "custombrowser_pkey" PRIMARY KEY using index "custombrowser_pkey";
alter table "public"."custombrowser" add constraint "custombrowser_name_key" UNIQUE using index "custombrowser_name_key";
-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.mythictree_display_path(fileobj_row mythictree)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
SELECT convert_from(fileobj_row.display_path, 'utf8')
           $function$
;
-- +migrate StatementEnd
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


