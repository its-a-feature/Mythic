-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

CREATE OR REPLACE TRIGGER set_public_credential_updated_timestamp BEFORE UPDATE ON "public"."credential" FOR EACH ROW EXECUTE FUNCTION set_current_timestamp();
CREATE OR REPLACE TRIGGER set_public_filemeta_updated_timestamp BEFORE UPDATE ON "public"."filemeta" FOR EACH ROW EXECUTE FUNCTION set_current_timestamp();
CREATE OR REPLACE TRIGGER set_public_keylog_updated_timestamp BEFORE UPDATE ON "public"."keylog" FOR EACH ROW EXECUTE FUNCTION set_current_timestamp();
-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


