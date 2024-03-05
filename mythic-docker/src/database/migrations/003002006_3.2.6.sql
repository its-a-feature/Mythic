-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."payloadtype" add column if not exists "agent_type" text not null default 'agent'::text;


-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


