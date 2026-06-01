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

alter table "public"."chat_channel"
    add column if not exists "apitokens_id" integer;

alter table "public"."chat_channel" drop constraint if exists "chat_channel_apitokens_id_fkey";
alter table "public"."chat_channel" add constraint "chat_channel_apitokens_id_fkey"
    foreign key ("apitokens_id") references "public"."apitokens"("id") on update restrict on delete restrict not valid;
alter table "public"."chat_channel" validate constraint "chat_channel_apitokens_id_fkey";

alter table "public"."chat_channel" drop constraint if exists "chat_channel_ai_apitoken_check";
alter table "public"."chat_channel" add constraint "chat_channel_ai_apitoken_check"
    check (channel_type <> 'ai' or apitokens_id is not null) not valid;

create index if not exists chat_channel_apitokens_id_idx
on "public"."chat_channel" using btree (apitokens_id);

alter table "public"."apitokens"
    add column if not exists "chat_channel_id" integer;

alter table "public"."apitokens" drop constraint if exists "apitokens_chat_channel_id_fkey";
alter table "public"."apitokens" add constraint "apitokens_chat_channel_id_fkey"
    foreign key ("chat_channel_id") references "public"."chat_channel"("id") on update restrict on delete restrict not valid;
alter table "public"."apitokens" validate constraint "apitokens_chat_channel_id_fkey";

create index if not exists apitokens_chat_channel_id_idx
on "public"."apitokens" using btree (chat_channel_id);

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

drop index if exists "public"."apitokens_chat_channel_id_idx";
alter table "public"."apitokens" drop constraint if exists "apitokens_chat_channel_id_fkey";
alter table "public"."apitokens"
    drop column if exists "chat_channel_id";

drop index if exists "public"."chat_channel_apitokens_id_idx";
alter table "public"."chat_channel" drop constraint if exists "chat_channel_ai_apitoken_check";
alter table "public"."chat_channel" drop constraint if exists "chat_channel_apitokens_id_fkey";
alter table "public"."chat_channel"
    drop column if exists "apitokens_id";

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_user_interaction_resolved_by_fkey";

alter table "public"."eventstepinstance"
    drop column if exists "user_interaction_resolved_at",
    drop column if exists "user_interaction_resolved_by",
    drop column if exists "user_interaction_response",
    drop column if exists "user_interaction";

alter table "public"."eventstep"
    drop column if exists "user_interaction";
