-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

-- Ownership cannot be inferred for historical rows. Keep those rows intact and
-- nullable so they remain quarantined from normal container queries until an
-- administrator explicitly attributes them.
alter table "public"."agentstorage"
    add column if not exists operation_id integer references "public"."operation"(id) on delete cascade;

alter table "public"."agentstorage"
    add column if not exists container_principal text;

-- PostgreSQL enforces a NOT VALID CHECK for all new/updated rows without
-- scanning historical rows. This preserves legacy data in quarantine while
-- preventing the quarantine population from growing after this migration.
alter table "public"."agentstorage"
    add constraint agentstorage_owner_required
    check (operation_id is not null and container_principal is not null) not valid;

drop index if exists "public".agentstorage_unique_id;

create unique index if not exists agentstorage_tenant_unique_id
    on "public"."agentstorage" (operation_id, container_principal, unique_id)
    where operation_id is not null and container_principal is not null;

create index if not exists agentstorage_legacy_quarantine
    on "public"."agentstorage" (id)
    where operation_id is null or container_principal is null;

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

drop index if exists "public".agentstorage_legacy_quarantine;
drop index if exists "public".agentstorage_tenant_unique_id;

alter table "public"."agentstorage" drop constraint if exists agentstorage_owner_required;

-- A downgrade can only restore the historical global uniqueness constraint when
-- independently owned tenants have not reused a unique_id.
do $$
begin
    if exists (
        select 1 from "public"."agentstorage"
        group by unique_id having count(*) > 1
    ) then
        raise exception 'cannot downgrade agentstorage tenancy after multiple tenants reused a unique_id';
    end if;
end
$$;
create unique index agentstorage_unique_id on "public"."agentstorage" (unique_id);

alter table "public"."agentstorage" drop column if exists container_principal;
alter table "public"."agentstorage" drop column if exists operation_id;
