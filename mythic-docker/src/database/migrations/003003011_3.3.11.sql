-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."tag" add column IF NOT EXISTS "callback_id" integer;
alter table "public"."tag" add column IF NOT EXISTS "payload_id" integer;
alter table "public"."payloadtype" add column IF NOT EXISTS "supports_multiple_c2_in_build" boolean not null default false;
alter table "public"."payloadtype" add column IF NOT EXISTS "supports_multiple_c2_instances_in_build" boolean not null default false;

alter table "public"."tag" add constraint "tag_callback_id_fkey" FOREIGN KEY (callback_id) REFERENCES callback(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tag" validate constraint "tag_callback_id_fkey";
alter table "public"."tag" add constraint "tag_payload_id_fkey" FOREIGN KEY (payload_id) REFERENCES payload(id) ON UPDATE RESTRICT ON DELETE RESTRICT not valid;
alter table "public"."tag" validate constraint "tag_payload_id_fkey";

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.tag_update_linked_table() RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        IF OLD.task_id IS NOT NULL THEN
            UPDATE public.task SET timestamp=Now() WHERE id=OLD.task_id;
        END IF;
        IF OLD.filemeta_id IS NOT NULL THEN
            UPDATE public.filemeta SET timestamp=NOW() WHERE id=OLD.filemeta_id;
        END IF;
        IF OLD.mythictree_id IS NOT NULL THEN
            UPDATE public.mythictree SET timestamp=NOW() WHERE id=OLD.mythictree_id;
        END IF;
        IF OLD.credential_id IS NOT NULL THEN
            UPDATE public.credential SET timestamp=NOW() WHERE id=OLD.credential_id;
        END IF;
        IF OLD.taskartifact_id IS NOT NULL THEN
            UPDATE public.taskartifact SET timestamp=NOW() WHERE id=OLD.taskartifact_id;
        END IF;
        IF OLD.keylog_id IS NOT NULL THEN
            UPDATE public.keylog SET timestamp=NOW() WHERE id=OLD.keylog_id;
        END IF;
        IF OLD.response_id IS NOT NULL THEN
            UPDATE public.response SET timestamp=NOW() WHERE id=OLD.response_id;
        END IF;
        IF OLD.payload_id IS NOT NULL THEN
            UPDATE public.payload SET timestamp=NOW() WHERE id=OLD.payload_id;
        END IF;
        IF OLD.callback_id IS NOT NULL THEN
            UPDATE public.callback SET timestamp=NOW() WHERE id=OLD.callback_id;
        END IF;
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        IF NEW.task_id IS NOT NULL THEN
            UPDATE public.task SET timestamp=Now() WHERE id=NEW.task_id;
        END IF;
        IF NEW.filemeta_id IS NOT NULL THEN
            UPDATE public.filemeta SET timestamp=NOW() WHERE id=NEW.filemeta_id;
        END IF;
        IF NEW.mythictree_id IS NOT NULL THEN
            UPDATE public.mythictree SET timestamp=NOW() WHERE id=NEW.mythictree_id;
        END IF;
        IF NEW.credential_id IS NOT NULL THEN
            UPDATE public.credential SET timestamp=NOW() WHERE id=NEW.credential_id;
        END IF;
        IF NEW.taskartifact_id IS NOT NULL THEN
            UPDATE public.taskartifact SET timestamp=NOW() WHERE id=NEW.taskartifact_id;
        END IF;
        IF NEW.keylog_id IS NOT NULL THEN
            UPDATE public.keylog SET timestamp=NOW() WHERE id=NEW.keylog_id;
        END IF;
        IF NEW.response_id IS NOT NULL THEN
            UPDATE public.response SET timestamp=NOW() WHERE id=NEW.response_id;
        END IF;
        IF NEW.payload_id IS NOT NULL THEN
            UPDATE public.payload SET timestamp=NOW() WHERE id=NEW.payload_id;
        END IF;
        IF NEW.callback_id IS NOT NULL THEN
            UPDATE public.callback SET timestamp=NOW() WHERE id=NEW.callback_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;
-- +migrate StatementEnd
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


