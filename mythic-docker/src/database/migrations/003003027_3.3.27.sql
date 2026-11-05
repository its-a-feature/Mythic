-- +migrate Up
ALTER TABLE public.operator ADD COLUMN IF NOT EXISTS session_version bigint NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.revoked_session (
    id text PRIMARY KEY
);

-- Apply revocation in the same transaction as any lifecycle change, including
-- changes made through Hasura rather than the HTTP controllers.
-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.revoke_operator_credentials() RETURNS trigger AS $$
BEGIN
    IF (NEW.password, NEW.salt, NEW.active, NEW.deleted, NEW.admin)
        IS DISTINCT FROM (OLD.password, OLD.salt, OLD.active, OLD.deleted, OLD.admin) THEN
        NEW.session_version := OLD.session_version + 1;
        UPDATE public.apitokens SET active=false, deleted=true WHERE operator_id=OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd
DROP TRIGGER IF EXISTS operator_credentials_changed ON public.operator;
CREATE TRIGGER operator_credentials_changed BEFORE UPDATE ON public.operator
FOR EACH ROW EXECUTE FUNCTION public.revoke_operator_credentials();

-- +migrate Down
DROP TRIGGER operator_credentials_changed ON public.operator;
DROP FUNCTION public.revoke_operator_credentials();
DROP TABLE public.revoked_session;
ALTER TABLE public.operator DROP COLUMN session_version;
