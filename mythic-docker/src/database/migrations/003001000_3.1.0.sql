-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
drop index if exists "public"."mythictree_metadata";

drop index if exists "public"."supported_ui_features";

alter table "public"."payload_build_step" add column if not exists "step_skip" boolean not null default false;

alter table "public"."response" add column if not exists "is_error" boolean not null default false;

alter table "public"."task" add column if not exists "interactive_task_type" integer;

alter table "public"."task" add column if not exists "is_interactive_task" boolean not null default false;

alter table "public"."callbackport" add column if not exists "deleted" boolean not null default false;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back
alter table "public"."payload_build_step" drop column "step_skip";

alter table "public"."response" drop column "is_error";

alter table "public"."task" drop column "interactive_task_type";

alter table "public"."task" drop column "is_interactive_task";

alter table "public"."callbackport" drop column "deleted";

CREATE INDEX mythictree_metadata ON public.mythictree USING btree (metadata);

CREATE INDEX supported_ui_features ON public.command USING btree (supported_ui_features);

