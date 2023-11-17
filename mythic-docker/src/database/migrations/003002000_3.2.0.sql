-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."filemeta" drop constraint if exists "filemeta_mythictree_id_fkey";
alter table "public"."task" drop constraint if exists "fk_task_token_id_refs_token";
alter table "public"."mythictree" drop constraint if exists "mythictree_tree_type_full_path_host_operation_id_key";
alter table "public"."mythictree" drop constraint if exists "mythictree_callback_id_fkey";
alter table "public"."mythictree" drop constraint if exists "mythictree_callback_id_tree_type_full_path_host_operation_id_ke";
drop index if exists "public"."mythictree_tree_type_full_path_host_operation_id_key";
drop index if exists "public"."mythictree_callback_id_tree_type_full_path_host_operation_id_ke";
alter table "public"."callback" add column if not exists "mythictree_groups" text[] not null default '{Default}'::text[];
alter table "public"."mythictree" add column if not exists "callback_id" integer;

CREATE UNIQUE INDEX mythictree_callback_id_tree_type_full_path_host_operation_id_ke ON public.mythictree USING btree (callback_id, tree_type, full_path, host, operation_id);
alter table "public"."mythictree" add constraint "mythictree_callback_id_fkey" FOREIGN KEY (callback_id) REFERENCES callback(id) ON UPDATE SET NULL ON DELETE SET NULL not valid;
alter table "public"."mythictree" validate constraint "mythictree_callback_id_fkey";
alter table "public"."mythictree" add constraint "mythictree_callback_id_tree_type_full_path_host_operation_id_ke" UNIQUE using index "mythictree_callback_id_tree_type_full_path_host_operation_id_ke";

alter table "public"."task" add constraint "task_token_id_fkey" FOREIGN KEY (token_id) REFERENCES token(id) ON UPDATE SET NULL ON DELETE SET NULL not valid;
alter table "public"."task" validate constraint "task_token_id_fkey";
alter table "public"."filemeta" add constraint "filemeta_mythictree_id_fkey" FOREIGN KEY (mythictree_id) REFERENCES mythictree(id) ON UPDATE SET NULL ON DELETE SET NULL not valid;
alter table "public"."filemeta" validate constraint "filemeta_mythictree_id_fkey";

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back
alter table "public"."c2profileparametersinstance" drop constraint if exists "c2profileparametersinstance_c2_profile_parameters_id_operation_";

drop index if exists "public"."c2profileparametersinstance_c2_profile_parameters_id_operation_";

