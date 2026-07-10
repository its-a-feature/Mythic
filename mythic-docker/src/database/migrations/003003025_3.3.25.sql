-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

drop trigger if exists touch_chat_channel_for_chat_request_update_trigger on "public"."chat_request";
drop trigger if exists touch_chat_channel_for_chat_request_insert_trigger on "public"."chat_request";
drop function if exists public.touch_chat_channel_for_chat_request_change();

drop trigger if exists touch_chat_channel_for_chat_message_update_trigger on "public"."chat_message";
drop function if exists public.touch_chat_channel_for_chat_message_update();

create index if not exists chat_message_operation_channel_updated_id_idx
    on "public"."chat_message" (operation_id, channel_id, updated_at, id);

create index if not exists chat_request_operation_channel_updated_id_idx
    on "public"."chat_request" (operation_id, channel_id, updated_at, id);

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

drop index if exists "public".chat_request_operation_channel_updated_id_idx;
drop index if exists "public".chat_message_operation_channel_updated_id_idx;

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
