-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied
CREATE OR REPLACE FUNCTION public.keylog_keystrokes(keylog_row keylog)
    RETURNS text
    LANGUAGE sql
    STABLE
AS $function$
SELECT encode(keylog_row.keystrokes, 'base64')
$function$
;


-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back


