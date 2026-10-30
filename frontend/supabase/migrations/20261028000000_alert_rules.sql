create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company text not null check (length(trim(company)) > 0),
  metric text not null check (metric in ('reported_total', 'scope1', 'scope2', 'scope3', 'emissions_intensity', 'yoy_change_percent')),
  operator text not null check (operator in ('gt', 'lt')),
  threshold numeric not null check (threshold::text not in ('NaN', 'Infinity', '-Infinity')),
  unit text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id, company)
);

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rule_id uuid not null,
  company text not null,
  reporting_year text not null,
  observed_value numeric not null check (observed_value::text not in ('NaN', 'Infinity', '-Infinity')),
  threshold numeric not null,
  evidence jsonb not null,
  triggered_at timestamptz not null default now(),
  foreign key (rule_id, user_id, company) references public.alert_rules (id, user_id, company) on delete cascade,
  unique (rule_id, company, reporting_year, observed_value)
);

create index alert_rules_user_company_idx on public.alert_rules (user_id, company);
create index alert_events_user_company_idx on public.alert_events (user_id, company);
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;
revoke all on public.alert_rules, public.alert_events from anon, authenticated;
grant select, insert, update, delete on public.alert_rules, public.alert_events to authenticated;

create policy "Users manage only their own alert rules"
  on public.alert_rules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage only their own alert events"
  on public.alert_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
