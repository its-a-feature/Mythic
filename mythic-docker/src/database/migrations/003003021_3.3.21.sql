-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

alter table "public"."eventstep"
    add column if not exists "user_interaction" jsonb not null default jsonb_build_object();

alter table "public"."eventstepinstance"
    add column if not exists "user_interaction" jsonb not null default jsonb_build_object(),
    add column if not exists "user_interaction_response" jsonb not null default jsonb_build_object(),
    add column if not exists "user_interaction_resolved_by" integer,
    add column if not exists "user_interaction_resolved_at" timestamp without time zone;

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_user_interaction_resolved_by_fkey";
alter table "public"."eventstepinstance" add constraint "eventstepinstance_user_interaction_resolved_by_fkey"
    foreign key ("user_interaction_resolved_by") references "public"."operator"("id") on update restrict on delete restrict not valid;
alter table "public"."eventstepinstance" validate constraint "eventstepinstance_user_interaction_resolved_by_fkey";

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_user_interaction_resolved_by_fkey";

alter table "public"."eventstepinstance"
    drop column if exists "user_interaction_resolved_at",
    drop column if exists "user_interaction_resolved_by",
    drop column if exists "user_interaction_response",
    drop column if exists "user_interaction";

alter table "public"."eventstep"
    drop column if exists "user_interaction";
