-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

create table if not exists "public"."operation_display_counters" (
    operation_id integer primary key references "public"."operation"(id) on delete cascade,
    last_task_display_id integer not null default 0,
    last_callback_display_id integer not null default 0
);

insert into "public"."operation_display_counters" (
    operation_id,
    last_task_display_id,
    last_callback_display_id
)
select
    op.id,
    coalesce((select max(display_id) from "public"."task" where operation_id = op.id), 0),
    coalesce((select max(display_id) from "public"."callback" where operation_id = op.id), 0)
from "public"."operation" op
on conflict (operation_id) do update
set
    last_task_display_id = greatest(
        "public"."operation_display_counters".last_task_display_id,
        excluded.last_task_display_id
    ),
    last_callback_display_id = greatest(
        "public"."operation_display_counters".last_callback_display_id,
        excluded.last_callback_display_id
    );

-- +migrate StatementBegin
do $$
begin
    if exists (
        select 1
        from "public"."task"
        group by operation_id, display_id
        having count(*) > 1
    ) then
        raise exception 'Cannot add task(operation_id, display_id) uniqueness because duplicate task display IDs already exist';
    end if;

    if exists (
        select 1
        from "public"."callback"
        group by operation_id, display_id
        having count(*) > 1
    ) then
        raise exception 'Cannot add callback(operation_id, display_id) uniqueness because duplicate callback display IDs already exist';
    end if;
end $$;
-- +migrate StatementEnd

create unique index if not exists task_operation_display_id_unique
on "public"."task" using btree (operation_id, display_id);

create unique index if not exists callback_operation_display_id_unique
on "public"."callback" using btree (operation_id, display_id);

-- +migrate StatementBegin
create or replace function public.new_task_display_id() returns trigger
    language plpgsql
    as $$
begin
    insert into "public"."operation_display_counters" (operation_id)
    values (new.operation_id)
    on conflict (operation_id) do nothing;

    update "public"."operation_display_counters"
    set last_task_display_id = last_task_display_id + 1
    where operation_id = new.operation_id
    returning last_task_display_id into new.display_id;

    return new;
end;
$$;
-- +migrate StatementEnd

-- +migrate StatementBegin
create or replace function public.new_callback_display_id() returns trigger
    language plpgsql
    as $$
begin
    insert into "public"."operation_display_counters" (operation_id)
    values (new.operation_id)
    on conflict (operation_id) do nothing;

    update "public"."operation_display_counters"
    set last_callback_display_id = last_callback_display_id + 1
    where operation_id = new.operation_id
    returning last_callback_display_id into new.display_id;

    return new;
end;
$$;
-- +migrate StatementEnd

update "public"."task"
set response_count = response_counts.total
from (
    select
        task.id,
        count(response.id)::integer as total
    from "public"."task"
    left join "public"."response" on response.task_id = task.id
    group by task.id
) response_counts
where task.id = response_counts.id
and task.response_count is distinct from response_counts.total;

-- +migrate StatementBegin
create or replace function public.update_task_response_count() returns trigger
    language plpgsql
    as $$
begin
    update "public"."task"
    set response_count = response_count + 1
    where id = new.task_id;

    return new;
end;
$$;
-- +migrate StatementEnd

-- +migrate Down
-- SQL in section 'Down' is executed when this migration is rolled back

-- +migrate StatementBegin
create or replace function public.update_task_response_count() returns trigger
    language plpgsql
    as $$
declare
   current_max integer;
begin
    select count(*)
    into current_max
    from response
    where task_id = new.task_id;

    update task set response_count = current_max where id = new.task_id;
    return new;
end;
$$;
-- +migrate StatementEnd

-- +migrate StatementBegin
create or replace function public.new_callback_display_id() returns trigger
    language plpgsql
    as $$
declare
   current_max integer;
begin
    select greatest(0, max(display_id))
    into current_max
    from callback
    where operation_id = new.operation_id;

    new.display_id := current_max + 1;
    return new;
end;
$$;
-- +migrate StatementEnd

-- +migrate StatementBegin
create or replace function public.new_task_display_id() returns trigger
    language plpgsql
    as $$
declare
   current_max integer;
begin
    select greatest(0, max(display_id))
    into current_max
    from task
    where operation_id = new.operation_id;

    new.display_id := current_max + 1;
    return new;
end;
$$;
-- +migrate StatementEnd

drop index if exists "public"."callback_operation_display_id_unique";
drop index if exists "public"."task_operation_display_id_unique";
drop table if exists "public"."operation_display_counters";
