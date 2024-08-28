-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
create sequence IF NOT EXISTS "public"."consuming_container_id_seq";

create sequence IF NOT EXISTS "public"."eventgroup_id_seq";

create sequence IF NOT EXISTS "public"."eventgroupapproval_id_seq";

create sequence IF NOT EXISTS "public"."eventgroupconsumingcontainer_id_seq";

create sequence IF NOT EXISTS "public"."eventgroupinstance_id_seq";

create sequence IF NOT EXISTS "public"."eventstep_id_seq";

create sequence IF NOT EXISTS "public"."eventstepinstance_id_seq";

alter table "public"."callbackgraphedge" drop constraint IF EXISTS "callbackgraphedge_end_timestamp_source_id_destination_id_c2_pro";

drop index if exists "public"."callbackgraphedge_end_timestamp_source_id_destination_id_c2_pro";

create table IF NOT EXISTS "public"."consuming_container" (
                                                "name" text not null,
                                                "id" integer not null default nextval('consuming_container_id_seq'::regclass),
                                                "description" text not null default ''::text,
                                                "type" text not null default 'unknown'::text,
                                                "deleted" boolean not null default false,
                                                "container_running" boolean not null default false,
                                                "updated_at" timestamp with time zone not null default now(),
                                                "created_at" timestamp with time zone not null default now(),
                                                "subscriptions" jsonb not null default jsonb_build_array(),
                                                constraint "consuming_container_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventgroup" (
                                       "id" integer not null default nextval('eventgroup_id_seq'::regclass),
                                       "operator_id" integer not null,
                                       "operation_id" integer not null,
                                       "filemeta_id" integer not null,
                                       "name" text not null default ''::text,
                                       "description" text not null default ''::text,
                                       "trigger" text not null default 'manual'::text,
                                       "trigger_data" jsonb not null default jsonb_build_object(),
                                       "active" boolean not null default true,
                                       "deleted" boolean not null default false,
                                       "environment" jsonb not null default jsonb_build_object(),
                                       "keywords" jsonb not null default jsonb_build_array(),
                                       "created_at" timestamp without time zone default now(),
                                       "updated_at" timestamp without time zone not null default now(),
                                       "total_steps" integer not null default 0,
                                       "total_order_steps" integer not null default 0,
                                       "run_as" text not null default 'bot'::text,
                                       "approved_to_run" boolean not null default false,
                                       "next_scheduled_run" timestamp without time zone,
                                       constraint "eventgroup_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventgroupapproval" (
                                               "id" integer not null default nextval('eventgroupapproval_id_seq'::regclass),
                                               "eventgroup_id" integer not null,
                                               "operator_id" integer not null,
                                               "approved" boolean not null default false,
                                               "created_at" timestamp without time zone not null default now(),
                                               "updated_at" timestamp without time zone not null default now(),
                                               "operation_id" integer not null,
                                               constraint "eventgroupapproval_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventgroupconsumingcontainer" (
                                                         "eventgroup_id" integer not null,
                                                         "consuming_container_id" integer,
                                                         "id" integer not null default nextval('eventgroupconsumingcontainer_id_seq'::regclass),
                                                         "consuming_container_name" text not null,
                                                         "function_names" json not null default json_build_array(),
                                                         "all_functions_available" boolean not null default false,
                                                         constraint "eventgroupconsumingcontainer_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventgroupinstance" (
                                               "id" integer not null default nextval('eventgroupinstance_id_seq'::regclass),
                                               "eventgroup_id" integer not null,
                                               "operator_id" integer not null,
                                               "operation_id" integer not null,
                                               "environment" jsonb not null default jsonb_build_object(),
                                               "status" text not null default 'running'::text,
                                               "created_at" timestamp without time zone not null default now(),
                                               "end_timestamp" timestamp without time zone,
                                               "updated_at" timestamp without time zone not null default now(),
                                               "trigger" text not null default ''::text,
                                               "current_order_step" integer not null default 0,
                                               "total_order_steps" integer not null default 0,
                                               "cancelled_by" integer,
                                               "trigger_metadata" jsonb not null default jsonb_build_object(),
                                               constraint "eventgroupinstance_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventstep" (
                                      "id" integer not null default nextval('eventstep_id_seq'::regclass),
                                      "eventgroup_id" integer not null,
                                      "environment" jsonb not null default jsonb_build_object(),
                                      "name" text not null default ''::text,
                                      "description" text not null default ''::text,
                                      "depends_on" jsonb not null default jsonb_build_array(),
                                      "action" text not null,
                                      "action_data" jsonb not null default jsonb_build_object(),
                                      "inputs" jsonb not null,
                                      "outputs" jsonb not null,
                                      "order" integer not null,
                                      "operation_id" integer not null,
                                      "operator_id" integer not null,
                                      "created_at" timestamp without time zone default now(),
                                      "continue_on_error" boolean not null default false,
                                      constraint "eventstep_pkey" PRIMARY KEY (id)
);


create table IF NOT EXISTS "public"."eventstepinstance" (
                                              "id" integer not null default nextval('eventstepinstance_id_seq'::regclass),
                                              "eventgroupinstance_id" integer not null,
                                              "eventstep_id" integer not null,
                                              "operator_id" integer not null,
                                              "operation_id" integer not null,
                                              "environment" jsonb not null default jsonb_build_object(),
                                              "inputs" jsonb not null default jsonb_build_object(),
                                              "outputs" jsonb not null default jsonb_build_object(),
                                              "created_at" timestamp without time zone not null default now(),
                                              "updated_at" timestamp without time zone not null default now(),
                                              "end_timestamp" timestamp without time zone,
                                              "status" text not null default ''::text,
                                              "stdout" text not null default ''::text,
                                              "stderr" text not null default ''::text,
                                              "order" integer not null,
                                              "action_data" jsonb not null default jsonb_build_object(),
                                              "continue_on_error" boolean not null default false,
                                              constraint "eventstepinstance_pkey" PRIMARY KEY (id)
);


alter table "public"."apitokens" add column IF NOT EXISTS "callback_id" integer;

alter table "public"."apitokens" add column IF NOT EXISTS "created_by" integer;

alter table "public"."apitokens" add column IF NOT EXISTS "deleted" boolean not null default false;

alter table "public"."apitokens" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."apitokens" add column IF NOT EXISTS "name" text not null default ''::text;

alter table "public"."apitokens" add column IF NOT EXISTS "payload_id" integer;

alter table "public"."apitokens" add column IF NOT EXISTS "task_id" integer;

alter table "public"."callback" add column IF NOT EXISTS "dead" boolean not null default false;

alter table "public"."callback" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."callback" add column IF NOT EXISTS "process_short_name" text not null default ''::text;

alter table "public"."callbackgraphedge" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."callbackport" add column IF NOT EXISTS "updated_at" timestamp without time zone not null default now();

alter table "public"."credential" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."filemeta" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."filemeta" add column IF NOT EXISTS "eventgroup_id" integer;

alter table "public"."filemeta" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."keylog" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."loadedcommands" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."mythictree" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."operation" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."operation" add column IF NOT EXISTS "updated_at" timestamp without time zone not null default now();

alter table "public"."operationeventlog" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."operator" add column IF NOT EXISTS "account_type" text not null default 'user'::text;

alter table "public"."operator" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."operator" add column IF NOT EXISTS "email" text;

alter table "public"."operator" alter column "preferences" drop not null;

alter table "public"."operator" alter column "secrets" drop not null;

alter table "public"."operatoroperation" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."payload" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."payload" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."payloadtype" drop column IF EXISTS "container_count";

alter table "public"."payloadtype" add column IF NOT EXISTS "command_augment_supported_agents" json not null default json_build_array();

alter table "public"."payloadtype" add column IF NOT EXISTS "message_uuid_length" integer not null default 36;

alter table "public"."response" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."response" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."tag" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."tag" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."tagtype" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."tagtype" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."task" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."task" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."task" add column IF NOT EXISTS "has_intercepted_response" boolean not null default false;

alter table "public"."taskartifact" add column IF NOT EXISTS "apitokens_id" integer;

alter table "public"."taskartifact" add column IF NOT EXISTS "eventstepinstance_id" integer;

alter table "public"."taskartifact" add column IF NOT EXISTS "needs_cleanup" boolean not null default false;

alter table "public"."taskartifact" add column IF NOT EXISTS "resolved" boolean not null default false;

alter table "public"."taskartifact" add column IF NOT EXISTS "updated_at" timestamp without time zone not null default now();

alter sequence IF EXISTS "public"."consuming_container_id_seq" owned by "public"."consuming_container"."id";

alter sequence IF EXISTS "public"."eventgroup_id_seq" owned by "public"."eventgroup"."id";

alter sequence IF EXISTS "public"."eventgroupapproval_id_seq" owned by "public"."eventgroupapproval"."id";

alter sequence IF EXISTS "public"."eventgroupconsumingcontainer_id_seq" owned by "public"."eventgroupconsumingcontainer"."id";

alter sequence IF EXISTS "public"."eventgroupinstance_id_seq" owned by "public"."eventgroupinstance"."id";

alter sequence IF EXISTS "public"."eventstep_id_seq" owned by "public"."eventstep"."id";

alter sequence IF EXISTS "public"."eventstepinstance_id_seq" owned by "public"."eventstepinstance"."id";

CREATE UNIQUE INDEX IF NOT EXISTS consuming_container_pkey ON public.consuming_container USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventgroup_pkey ON public.eventgroup USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventgroupapproval_pkey ON public.eventgroupapproval USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventgroupconsumingcontainer_pkey ON public.eventgroupconsumingcontainer USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventgroupinstance_pkey ON public.eventgroupinstance USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventstep_pkey ON public.eventstep USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS eventstepinstance_pkey ON public.eventstepinstance USING btree (id);


--alter table "public"."consuming_container" drop constraint if exists "consuming_container_pkey";
--alter table "public"."consuming_container" add constraint "consuming_container_pkey" PRIMARY KEY using index "consuming_container_pkey";

--alter table "public"."eventgroup" drop constraint if exists "eventgroup_pkey";
--alter table "public"."eventgroup" add constraint "eventgroup_pkey" PRIMARY KEY using index "eventgroup_pkey";

--alter table "public"."eventgroupapproval" drop constraint if exists "eventgroupapproval_pkey";
--alter table "public"."eventgroupapproval" add constraint "eventgroupapproval_pkey" PRIMARY KEY using index "eventgroupapproval_pkey";

--alter table "public"."eventgroupconsumingcontainer" drop constraint if exists "eventgroupconsumingcontainer_pkey";
--alter table "public"."eventgroupconsumingcontainer" add constraint "eventgroupconsumingcontainer_pkey" PRIMARY KEY using index "eventgroupconsumingcontainer_pkey";

--alter table "public"."eventgroupinstance" drop constraint if exists "eventgroupinstance_pkey";
--alter table "public"."eventgroupinstance" add constraint "eventgroupinstance_pkey" PRIMARY KEY using index "eventgroupinstance_pkey";

--alter table "public"."eventstep" drop constraint if exists "eventstep_pkey";
--alter table "public"."eventstep" add constraint "eventstep_pkey" PRIMARY KEY using index "eventstep_pkey";

--alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_pkey";
--alter table "public"."eventstepinstance" add constraint "eventstepinstance_pkey" PRIMARY KEY using index "eventstepinstance_pkey";

alter table "public"."apitokens" drop constraint if exists "apitokens_callback_id_fkey";
alter table "public"."apitokens" add constraint "apitokens_callback_id_fkey" FOREIGN KEY (callback_id) REFERENCES callback(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."apitokens" validate constraint "apitokens_callback_id_fkey";

alter table "public"."apitokens" drop constraint if exists "apitokens_created_by_fkey";
alter table "public"."apitokens" add constraint "apitokens_created_by_fkey" FOREIGN KEY (created_by) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."apitokens" validate constraint "apitokens_created_by_fkey";

alter table "public"."apitokens" drop constraint if exists "apitokens_eventstepinstance_id_fkey";
alter table "public"."apitokens" add constraint "apitokens_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."apitokens" validate constraint "apitokens_eventstepinstance_id_fkey";

alter table "public"."apitokens" drop constraint if exists "apitokens_payload_id_fkey";
alter table "public"."apitokens" add constraint "apitokens_payload_id_fkey" FOREIGN KEY (payload_id) REFERENCES payload(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."apitokens" validate constraint "apitokens_payload_id_fkey";

alter table "public"."apitokens" drop constraint if exists "apitokens_task_id_fkey";
alter table "public"."apitokens" add constraint "apitokens_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."apitokens" validate constraint "apitokens_task_id_fkey";

alter table "public"."callback" drop constraint if exists "callback_eventstepinstance_id_fkey";
alter table "public"."callback" add constraint "callback_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."callback" validate constraint "callback_eventstepinstance_id_fkey";

alter table "public"."callbackgraphedge" drop constraint if exists "callbackgraphedge_apitokens_id_fkey";
alter table "public"."callbackgraphedge" add constraint "callbackgraphedge_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."callbackgraphedge" validate constraint "callbackgraphedge_apitokens_id_fkey";

alter table "public"."consuming_container" drop constraint if exists "consuming_container_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "consuming_container_name_key" ON "public"."consuming_container" USING btree (name);
alter table "public"."consuming_container" add constraint "consuming_container_name_key" UNIQUE using index "consuming_container_name_key";

alter table "public"."credential" drop constraint if exists "credential_apitoken_id_fkey";
alter table "public"."credential" add constraint "credential_apitoken_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."credential" validate constraint "credential_apitoken_id_fkey";

alter table "public"."eventgroup" drop constraint if exists "eventgroup_filemeta_id_fkey";
alter table "public"."eventgroup" add constraint "eventgroup_filemeta_id_fkey" FOREIGN KEY (filemeta_id) REFERENCES filemeta(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroup" validate constraint "eventgroup_filemeta_id_fkey";

alter table "public"."eventgroup" drop constraint if exists "eventgroup_operation_id_fkey";
alter table "public"."eventgroup" add constraint "eventgroup_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroup" validate constraint "eventgroup_operation_id_fkey";

alter table "public"."eventgroup" drop constraint if exists "eventgroup_operator_id_fkey";
alter table "public"."eventgroup" add constraint "eventgroup_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroup" validate constraint "eventgroup_operator_id_fkey";

alter table "public"."eventgroupapproval" drop constraint if exists "eventgroupapproval_eventgroup_id_fkey";
alter table "public"."eventgroupapproval" add constraint "eventgroupapproval_eventgroup_id_fkey" FOREIGN KEY (eventgroup_id) REFERENCES eventgroup(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupapproval" validate constraint "eventgroupapproval_eventgroup_id_fkey";

alter table "public"."eventgroupapproval" drop constraint if exists "eventgroupapproval_operation_id_fkey";
alter table "public"."eventgroupapproval" add constraint "eventgroupapproval_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupapproval" validate constraint "eventgroupapproval_operation_id_fkey";

alter table "public"."eventgroupapproval" drop constraint if exists "eventgroupapproval_operator_id_fkey";
alter table "public"."eventgroupapproval" add constraint "eventgroupapproval_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupapproval" validate constraint "eventgroupapproval_operator_id_fkey";

alter table "public"."eventgroupconsumingcontainer" drop constraint if exists "eventgroupconsumingcontainer_consuming_container_id_fkey";
alter table "public"."eventgroupconsumingcontainer" add constraint "eventgroupconsumingcontainer_consuming_container_id_fkey" FOREIGN KEY (consuming_container_id) REFERENCES consuming_container(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupconsumingcontainer" validate constraint "eventgroupconsumingcontainer_consuming_container_id_fkey";

alter table "public"."eventgroupconsumingcontainer" drop constraint if exists "eventgroupconsumingcontainer_eventgroup_id_fkey";
alter table "public"."eventgroupconsumingcontainer" add constraint "eventgroupconsumingcontainer_eventgroup_id_fkey" FOREIGN KEY (eventgroup_id) REFERENCES eventgroup(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupconsumingcontainer" validate constraint "eventgroupconsumingcontainer_eventgroup_id_fkey";

alter table "public"."eventgroupinstance" drop constraint if exists "eventgroupinstance_cancelled_by_fkey";
alter table "public"."eventgroupinstance" add constraint "eventgroupinstance_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupinstance" validate constraint "eventgroupinstance_cancelled_by_fkey";

alter table "public"."eventgroupinstance" drop constraint if exists "eventgroupinstance_eventgroup_id_fkey";
alter table "public"."eventgroupinstance" add constraint "eventgroupinstance_eventgroup_id_fkey" FOREIGN KEY (eventgroup_id) REFERENCES eventgroup(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupinstance" validate constraint "eventgroupinstance_eventgroup_id_fkey";

alter table "public"."eventgroupinstance" drop constraint if exists "eventgroupinstance_operation_id_fkey";
alter table "public"."eventgroupinstance" add constraint "eventgroupinstance_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupinstance" validate constraint "eventgroupinstance_operation_id_fkey";

alter table "public"."eventgroupinstance" drop constraint if exists "eventgroupinstance_operator_id_fkey";
alter table "public"."eventgroupinstance" add constraint "eventgroupinstance_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventgroupinstance" validate constraint "eventgroupinstance_operator_id_fkey";

alter table "public"."eventstep" drop constraint if exists "eventstep_eventgroup_id_fkey";
alter table "public"."eventstep" add constraint "eventstep_eventgroup_id_fkey" FOREIGN KEY (eventgroup_id) REFERENCES eventgroup(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstep" validate constraint "eventstep_eventgroup_id_fkey";

alter table "public"."eventstep" drop constraint if exists "eventstep_operation_id_fkey";
alter table "public"."eventstep" add constraint "eventstep_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstep" validate constraint "eventstep_operation_id_fkey";

alter table "public"."eventstep" drop constraint if exists "eventstep_operator_id_fkey";
alter table "public"."eventstep" add constraint "eventstep_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstep" validate constraint "eventstep_operator_id_fkey";

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_eventgroupinstance_id_fkey";
alter table "public"."eventstepinstance" add constraint "eventstepinstance_eventgroupinstance_id_fkey" FOREIGN KEY (eventgroupinstance_id) REFERENCES eventgroupinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstepinstance" validate constraint "eventstepinstance_eventgroupinstance_id_fkey";

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_eventstep_id_fkey";
alter table "public"."eventstepinstance" add constraint "eventstepinstance_eventstep_id_fkey" FOREIGN KEY (eventstep_id) REFERENCES eventstep(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstepinstance" validate constraint "eventstepinstance_eventstep_id_fkey";

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_operation_id_fkey";
alter table "public"."eventstepinstance" add constraint "eventstepinstance_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES operation(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstepinstance" validate constraint "eventstepinstance_operation_id_fkey";

alter table "public"."eventstepinstance" drop constraint if exists "eventstepinstance_operator_id_fkey";
alter table "public"."eventstepinstance" add constraint "eventstepinstance_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES operator(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."eventstepinstance" validate constraint "eventstepinstance_operator_id_fkey";

alter table "public"."filemeta" drop constraint if exists "filemeta_apitokens_id_fkey";
alter table "public"."filemeta" add constraint "filemeta_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."filemeta" validate constraint "filemeta_apitokens_id_fkey";

alter table "public"."filemeta" drop constraint if exists "filemeta_eventgroup_id_fkey";
alter table "public"."filemeta" add constraint "filemeta_eventgroup_id_fkey" FOREIGN KEY (eventgroup_id) REFERENCES eventgroup(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."filemeta" validate constraint "filemeta_eventgroup_id_fkey";

alter table "public"."filemeta" drop constraint if exists "filemeta_eventstepinstance_id_fkey";
alter table "public"."filemeta" add constraint "filemeta_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."filemeta" validate constraint "filemeta_eventstepinstance_id_fkey";

alter table "public"."keylog" drop constraint if exists "keylog_apitokens_id_fkey";
alter table "public"."keylog" add constraint "keylog_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."keylog" validate constraint "keylog_apitokens_id_fkey";

alter table "public"."loadedcommands" drop constraint if exists "loadedcommands_apitokens_id_fkey";
alter table "public"."loadedcommands" add constraint "loadedcommands_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."loadedcommands" validate constraint "loadedcommands_apitokens_id_fkey";

alter table "public"."mythictree" drop constraint if exists "mythictree_apitokens_id_fkey";
alter table "public"."mythictree" add constraint "mythictree_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."mythictree" validate constraint "mythictree_apitokens_id_fkey";

alter table "public"."operation" drop constraint if exists "operation_apitokens_id_fkey";
alter table "public"."operation" add constraint "operation_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."operation" validate constraint "operation_apitokens_id_fkey";

alter table "public"."operationeventlog" drop constraint if exists "operationeventlog_apitokens_id_fkey";
alter table "public"."operationeventlog" add constraint "operationeventlog_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."operationeventlog" validate constraint "operationeventlog_apitokens_id_fkey";

alter table "public"."operator" drop constraint if exists "operator_apitokens_id_fkey";
alter table "public"."operator" add constraint "operator_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."operator" validate constraint "operator_apitokens_id_fkey";

alter table "public"."operator" drop constraint if exists "operator_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS operator_email_key ON public.operator USING btree (email);
alter table "public"."operator" add constraint "operator_email_key" UNIQUE using index "operator_email_key";

alter table "public"."operatoroperation" drop constraint if exists "operatoroperation_apitokens_id_fkey";
alter table "public"."operatoroperation" add constraint "operatoroperation_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."operatoroperation" validate constraint "operatoroperation_apitokens_id_fkey";

alter table "public"."payload" drop constraint if exists "payload_apitokens_id_fkey";
alter table "public"."payload" add constraint "payload_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."payload" validate constraint "payload_apitokens_id_fkey";

alter table "public"."payload" drop constraint if exists "payload_eventstepinstance_id_fkey";
alter table "public"."payload" add constraint "payload_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."payload" validate constraint "payload_eventstepinstance_id_fkey";

alter table "public"."response" drop constraint if exists "response_apitokens_id_fkey";
alter table "public"."response" add constraint "response_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."response" validate constraint "response_apitokens_id_fkey";

alter table "public"."response" drop constraint if exists "response_eventstepinstance_id_fkey";
alter table "public"."response" add constraint "response_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."response" validate constraint "response_eventstepinstance_id_fkey";

alter table "public"."tag" drop constraint if exists "tag_apitokens_id_fkey";
alter table "public"."tag" add constraint "tag_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tag" validate constraint "tag_apitokens_id_fkey";

alter table "public"."tag" drop constraint if exists "tag_eventstepinstance_id_fkey";
alter table "public"."tag" add constraint "tag_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tag" validate constraint "tag_eventstepinstance_id_fkey";

alter table "public"."tagtype" drop constraint if exists "tagtype_apitokens_id_fkey";
alter table "public"."tagtype" add constraint "tagtype_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tagtype" validate constraint "tagtype_apitokens_id_fkey";

alter table "public"."tagtype" drop constraint if exists "tagtype_eventstepinstance_id_fkey";
alter table "public"."tagtype" add constraint "tagtype_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tagtype" validate constraint "tagtype_eventstepinstance_id_fkey";

alter table "public"."task" drop constraint if exists "task_apitokens_id_fkey";
alter table "public"."task" add constraint "task_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."task" validate constraint "task_apitokens_id_fkey";

alter table "public"."task" drop constraint if exists "task_eventstepinstance_id_fkey";
alter table "public"."task" add constraint "task_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."task" validate constraint "task_eventstepinstance_id_fkey";

alter table "public"."taskartifact" drop constraint if exists "taskartifact_apitokens_id_fkey";
alter table "public"."taskartifact" add constraint "taskartifact_apitokens_id_fkey" FOREIGN KEY (apitokens_id) REFERENCES apitokens(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."taskartifact" validate constraint "taskartifact_apitokens_id_fkey";

alter table "public"."taskartifact" drop constraint if exists "taskartifact_eventstepinstance_id_fkey";
alter table "public"."taskartifact" add constraint "taskartifact_eventstepinstance_id_fkey" FOREIGN KEY (eventstepinstance_id) REFERENCES eventstepinstance(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."taskartifact" validate constraint "taskartifact_eventstepinstance_id_fkey";

set check_function_bodies = off;
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

CREATE OR REPLACE TRIGGER set_public_callbackport_updated_at BEFORE UPDATE ON public.callbackport FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_consuming_container_updated_at BEFORE UPDATE ON public.consuming_container FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_eventgroup_updated_at BEFORE UPDATE ON public.eventgroup FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_eventgroupapproval_updated_at BEFORE UPDATE ON public.eventgroupapproval FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_eventgroupinstance_updated_at BEFORE UPDATE ON public.eventgroupinstance FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_eventstepinstance_updated_at BEFORE UPDATE ON public.eventstepinstance FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_operation_updated_at BEFORE UPDATE ON public.operation FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER set_public_taskartifact_updated_at BEFORE UPDATE ON public.taskartifact FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


