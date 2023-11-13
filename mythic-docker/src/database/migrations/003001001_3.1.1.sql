-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."c2profileparametersinstance" drop constraint if exists "c2profileparametersinstance_c2_profile_parameters_id_operation_";
CREATE UNIQUE INDEX IF NOT EXISTS c2profileparametersinstance_c2_profile_parameters_id_operation_ ON public.c2profileparametersinstance USING btree (c2_profile_parameters_id, operation_id, instance_name);
alter table "public"."c2profileparametersinstance" add constraint "c2profileparametersinstance_c2_profile_parameters_id_operation_" UNIQUE using index "c2profileparametersinstance_c2_profile_parameters_id_operation_";

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back
alter table "public"."c2profileparametersinstance" drop constraint if exists "c2profileparametersinstance_c2_profile_parameters_id_operation_";

drop index if exists "public"."c2profileparametersinstance_c2_profile_parameters_id_operation_";

