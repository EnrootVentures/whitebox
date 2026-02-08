create table if not exists organization_types (
  type_key text primary key,
  label text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_types_is_active_idx
  on organization_types (is_active);

create index if not exists organization_types_sort_order_idx
  on organization_types (sort_order);

create or replace function set_organization_types_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organization_types_updated_at on organization_types;
create trigger trg_organization_types_updated_at
before update on organization_types
for each row
execute function set_organization_types_updated_at();

insert into organization_types (type_key, label, description, is_active, sort_order)
values
  ('company', 'Company', 'Company / member organization', true, 1),
  ('supplier', 'Supplier', 'Supplier / business partner', true, 2),
  ('ngo', 'NGO', 'Non-governmental organization', true, 3),
  ('regulatory', 'Regulatory', 'Regulatory / authority organization', true, 4),
  ('service_provider', 'Service Provider', 'Advisor / investigation firm', true, 5)
on conflict (type_key) do update
set label = excluded.label;

insert into organization_types (type_key, label, is_active, sort_order)
select distinct
  trim(organization_type) as type_key,
  initcap(replace(trim(organization_type), '_', ' ')) as label,
  true as is_active,
  100
from organisations
where organization_type is not null
  and btrim(organization_type) <> ''
on conflict (type_key) do nothing;
