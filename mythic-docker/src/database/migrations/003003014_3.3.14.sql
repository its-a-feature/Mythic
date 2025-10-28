-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."filemeta" add column IF NOT EXISTS "copy_of_file_id" integer;
alter table "public"."buildparameter" add column IF NOT EXISTS "ui_position" integer not null default 0;
alter table "public"."buildparameter" add column IF NOT EXISTS "dynamic_query_function" text not null default ''::text;
alter table "public"."c2profileparameters" add column IF NOT EXISTS "ui_position" integer not null default 0;
alter table "public"."filemeta" drop constraint IF EXISTS "filemeta_copy_of_file_id_fkey";
alter table "public"."filemeta" add constraint "filemeta_copy_of_file_id_fkey" FOREIGN KEY (copy_of_file_id) REFERENCES filemeta(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."filemeta" validate constraint "filemeta_copy_of_file_id_fkey";
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


