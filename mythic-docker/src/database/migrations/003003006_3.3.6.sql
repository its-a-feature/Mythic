-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
alter table "public"."filemeta" alter column "size" TYPE BIGINT;
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


