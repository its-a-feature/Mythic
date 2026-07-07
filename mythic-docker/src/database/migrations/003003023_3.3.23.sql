-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

-- +migrate StatementBegin
create or replace function public.update_operation_alert_count() returns trigger
    language plpgsql
as $$
declare
    affected_operation_ids integer[];
    affected_operation_id integer;
begin
    if TG_OP = 'INSERT' then
        affected_operation_ids := array[NEW.operation_id];
    elsif TG_OP = 'UPDATE' then
        affected_operation_ids := array[OLD.operation_id, NEW.operation_id];
    else
        affected_operation_ids := array[OLD.operation_id];
    end if;

    for affected_operation_id in
        select distinct affected.id
        from unnest(affected_operation_ids) as affected(id)
        where affected.id is not null
        order by affected.id
    loop
        -- Serialize recalculation for this operation so concurrent event log writes cannot persist stale counts.
        perform 1
        from "public"."operation"
        where id = affected_operation_id
        for update;

        update "public"."operation"
        set alert_count = (
            select count(*)::integer
            from "public"."operationeventlog"
            where operation_id = affected_operation_id
              and resolved = false
              and deleted = false
              and (
                  warning = true
                  or "level" = 'warning'
              )
        )
        where id = affected_operation_id;
    end loop;

    if TG_OP = 'DELETE' then
        return OLD;
    end if;
    return NEW;
end;
$$;
-- +migrate StatementEnd

drop trigger if exists update_operation_alert_count_trigger on "public"."operationeventlog";
create trigger update_operation_alert_count_trigger
    after insert or delete or update of operation_id, resolved, deleted, warning, "level" on "public"."operationeventlog"
    for each row execute function public.update_operation_alert_count();

update "public"."operation" op
set alert_count = (
    select count(*)::integer
    from "public"."operationeventlog" log
    where log.operation_id = op.id
      and log.resolved = false
      and log.deleted = false
      and (
          log.warning = true
          or log."level" = 'warning'
      )
);

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

-- +migrate StatementBegin
create or replace function public.update_operation_alert_count() returns trigger
    language plpgsql
as $$
declare
    current_max integer;
begin
    select count(*)
    into current_max
    from operationeventlog
    where operation_id = NEW.operation_id and resolved=false and deleted=false and warning=true;

    update operation set alert_count = current_max where id = NEW.operation_id;
    return NEW;
end;
$$;
-- +migrate StatementEnd

drop trigger if exists update_operation_alert_count_trigger on "public"."operationeventlog";
create trigger update_operation_alert_count_trigger
    after insert or update on "public"."operationeventlog"
    for each row execute function public.update_operation_alert_count();
