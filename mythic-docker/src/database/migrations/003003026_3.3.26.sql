-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

-- Existing payloads intentionally keep {}. Metadata is supplied by the
-- builder, and inferring it from filenames or old payload type names is unsafe.
alter table "public"."payload"
    add column if not exists build_metadata jsonb not null default jsonb_build_object();

alter table "public"."payloadtype"
    add column if not exists wrapper_payload_requirements jsonb not null default jsonb_build_array();

create index if not exists payload_build_metadata_gin_idx on "public"."payload" using gin (build_metadata jsonb_path_ops);

drop table if exists "public"."wrappedpayloadtypes";

alter table "public"."payloadtype" drop column if exists supported_wrapping;

alter table "public"."response" add column if not exists interactive_task_type integer;

alter table "public"."filemeta" add column if not exists transfer_type text not null default 'chunk'::text;

alter table "public"."filemeta" add column if not exists total_size bigint default 0;

alter table "public"."filemeta" add column if not exists size_received bigint default 0;

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

alter table "public"."payloadtype"
    add column if not exists supported_wrapping jsonb not null default jsonb_build_array();

create table if not exists "public"."wrappedpayloadtypes" (
    id serial primary key,
    wrapper_id integer not null references "public"."payloadtype"(id) on delete cascade,
    wrapped_id integer not null references "public"."payloadtype"(id) on delete cascade
);

create index if not exists wrappedpayloadtypes_wrapper_id
    on "public"."wrappedpayloadtypes" (wrapper_id);

create index if not exists wrappedpayloadtypes_wrapped_id
    on "public"."wrappedpayloadtypes" (wrapped_id);

drop index if exists "public".payload_build_metadata_gin_idx;

alter table "public"."payloadtype" drop column if exists wrapper_payload_requirements;

alter table "public"."payload" drop column if exists build_metadata;

alter table "public"."response" drop column if exists interactive_task_type;

alter table "public"."filemeta" drop column if exists transfer_type;

alter table "public"."filemeta" drop column if exists total_size;

alter table "public"."filemeta" drop column if exists size_received;
