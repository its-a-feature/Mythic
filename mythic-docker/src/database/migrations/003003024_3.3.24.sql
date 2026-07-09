-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

alter table "public"."chat_message"
    add column if not exists tool_output text not null default '';

-- +migrate StatementBegin
create or replace function public.touch_chat_channel_for_chat_message_update() returns trigger
    language plpgsql
    as $$
begin
    update "public"."chat_channel"
    set updated_at = now()
    where id = new.channel_id;

    return new;
end;
$$;
-- +migrate StatementEnd

create or replace trigger touch_chat_channel_for_chat_message_update_trigger
after update of message, status, metadata, deleted, edited, tool_output on "public"."chat_message"
for each row execute function public.touch_chat_channel_for_chat_message_update();

-- +migrate StatementBegin
create or replace function public.touch_chat_channel_for_chat_request_change() returns trigger
    language plpgsql
    as $$
begin
    update "public"."chat_channel"
    set updated_at = now()
    where id = new.channel_id;

    return new;
end;
$$;
-- +migrate StatementEnd

create or replace trigger touch_chat_channel_for_chat_request_insert_trigger
after insert on "public"."chat_request"
for each row execute function public.touch_chat_channel_for_chat_request_change();

create or replace trigger touch_chat_channel_for_chat_request_update_trigger
after update of status, error, completed_at, cancelled_at on "public"."chat_request"
for each row execute function public.touch_chat_channel_for_chat_request_change();

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

drop trigger if exists touch_chat_channel_for_chat_request_update_trigger on "public"."chat_request";
drop trigger if exists touch_chat_channel_for_chat_request_insert_trigger on "public"."chat_request";
drop function if exists public.touch_chat_channel_for_chat_request_change();

drop trigger if exists touch_chat_channel_for_chat_message_update_trigger on "public"."chat_message";
drop function if exists public.touch_chat_channel_for_chat_message_update();

alter table "public"."chat_message"
    drop column if exists tool_output;
