-- +migrate Up
ALTER TABLE public.apitokens ADD COLUMN IF NOT EXISTS operation_id integer REFERENCES public.operation(id);
ALTER TABLE public.apitokens DROP CONSTRAINT IF EXISTS apitokens_operation_required;
-- Revoke tokens that are not tied to an operation.
UPDATE public.apitokens
SET active = FALSE,
    deleted = TRUE
WHERE operation_id IS NULL
  AND (active IS DISTINCT FROM FALSE OR deleted IS DISTINCT FROM TRUE);
ALTER TABLE public.apitokens ADD CONSTRAINT apitokens_operation_required
    CHECK (operation_id IS NOT NULL OR NOT (active AND NOT deleted));
ALTER TABLE public.apitokens DROP CONSTRAINT IF EXISTS apitokens_concrete_scopes;
ALTER TABLE public.apitokens ADD CONSTRAINT apitokens_concrete_scopes
    CHECK (NOT (active AND NOT deleted) OR
        (cardinality(scopes) > 0 AND array_position(scopes,NULL) IS NULL
         AND array_to_string(scopes,',') NOT LIKE '%*%'));
CREATE INDEX IF NOT EXISTS apitokens_operation_owner ON public.apitokens(operation_id,operator_id);
ALTER TABLE public.eventgroupinstance ADD COLUMN IF NOT EXISTS apitokens_id integer REFERENCES public.apitokens(id);

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.protect_token_boundary() RETURNS trigger AS $$
BEGIN
    IF (NEW.operation_id,NEW.operator_id) IS DISTINCT FROM (OLD.operation_id,OLD.operator_id) THEN
        RAISE EXCEPTION 'API token owner and operation are immutable; issue a new token';
    END IF;
    -- Revocation is permanent. Temporary disablement still uses active=false
    -- with deleted=false; membership removal and account changes use deleted.
    IF OLD.deleted AND NOT NEW.deleted THEN
        RAISE EXCEPTION 'Revoked API tokens cannot be restored; issue a new token';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd
DROP TRIGGER IF EXISTS apitokens_immutable_boundary ON public.apitokens;
CREATE TRIGGER apitokens_immutable_boundary BEFORE UPDATE ON public.apitokens
FOR EACH ROW EXECUTE FUNCTION public.protect_token_boundary();

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION public.revoke_operation_tokens() RETURNS trigger AS $$
BEGIN
    UPDATE public.apitokens SET active=false,deleted=true
    WHERE operator_id=OLD.operator_id AND operation_id=OLD.operation_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd
DROP TRIGGER IF EXISTS operatoroperation_tokens_removed ON public.operatoroperation;
CREATE TRIGGER operatoroperation_tokens_removed AFTER DELETE ON public.operatoroperation
FOR EACH ROW EXECUTE FUNCTION public.revoke_operation_tokens();

-- +migrate Down
DROP TRIGGER IF EXISTS operatoroperation_tokens_removed ON public.operatoroperation;
DROP FUNCTION IF EXISTS public.revoke_operation_tokens();
DROP TRIGGER IF EXISTS apitokens_immutable_boundary ON public.apitokens;
DROP FUNCTION IF EXISTS public.protect_token_boundary();
DROP INDEX IF EXISTS public.apitokens_operation_owner;
ALTER TABLE public.eventgroupinstance DROP COLUMN IF EXISTS apitokens_id;
ALTER TABLE public.apitokens DROP CONSTRAINT IF EXISTS apitokens_operation_required;
ALTER TABLE public.apitokens DROP CONSTRAINT IF EXISTS apitokens_concrete_scopes;
ALTER TABLE public.apitokens DROP COLUMN IF EXISTS operation_id;
