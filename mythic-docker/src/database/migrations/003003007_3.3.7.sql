-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."taskartifact" alter column "task_id" DROP NOT NULL;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


