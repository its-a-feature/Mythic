-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
CREATE OR REPLACE FUNCTION public.callback_mythictree_groups(callback_row callback)
    RETURNS text
    LANGUAGE sql
    STABLE
AS $function$
SELECT array_to_string(callback_row.mythictree_groups, ',')
$function$
;


-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


