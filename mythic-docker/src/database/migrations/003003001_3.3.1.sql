-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."callbackgraphedge" add column IF NOT EXISTS "updated_at" timestamp without time zone not null default now();
CREATE OR REPLACE TRIGGER set_public_callbackgraphedge_updated_at BEFORE UPDATE ON public.callbackgraphedge FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


