create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  activity_name text not null check (length(trim(activity_name)) > 0),
  amount numeric(14, 4) not null check (amount >= 0),
  unit text not null check (length(trim(unit)) > 0),
  co2_emission numeric(14, 4) not null check (co2_emission >= 0),
  activity_date date not null,
  created_at timestamptz not null default now()
);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  file_name text not null check (length(trim(file_name)) > 0 and lower(file_name) like '%.csv'),
  file_url text not null check (length(trim(file_url)) > 0 and lower(file_url) like '%.csv'),
  dataset_type text not null check (length(trim(dataset_type)) > 0),
  description text,
  source text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_comment text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint datasets_review_fields_consistent check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or
    (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  ),
  constraint datasets_rejection_comment_required check (
    status <> 'rejected' or length(trim(coalesce(admin_comment, ''))) > 0
  )
);

create index activities_user_date_idx on public.activities (user_id, activity_date desc);
create index datasets_uploaded_by_created_idx on public.datasets (uploaded_by, created_at desc);
create index datasets_status_created_idx on public.datasets (status, created_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.datasets enable row level security;

revoke all on public.profiles, public.activities, public.datasets from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update on public.activities to authenticated;
grant select, insert on public.datasets to authenticated;
grant update (status, admin_comment, reviewed_by, reviewed_at) on public.datasets to authenticated;

create policy "Profiles are visible to their owner and admins"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users can read their own activities"
  on public.activities for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own activities"
  on public.activities for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own activities"
  on public.activities for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users and admins can read datasets"
  on public.datasets for select to authenticated
  using (uploaded_by = (select auth.uid()) or (select public.is_admin()));

create policy "Users can submit pending datasets for themselves"
  on public.datasets for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and status = 'pending'
    and admin_comment is null
    and reviewed_by is null
    and reviewed_at is null
    and file_url like ((select auth.uid())::text || '/%')
    and exists (
      select 1
      from storage.objects
      where bucket_id = 'trustcarbon-datasets'
        and name = file_url
    )
  );

create policy "Admins can review datasets"
  on public.datasets for update to authenticated
  using ((select public.is_admin()) and status = 'pending')
  with check (
    (select public.is_admin())
    and status in ('approved', 'rejected')
    and reviewed_by = (select auth.uid())
    and reviewed_at is not null
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trustcarbon-datasets',
  'trustcarbon-datasets',
  false,
  52428800,
  array['text/csv', 'application/vnd.ms-excel']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload datasets to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trustcarbon-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read their own datasets and admins can read all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trustcarbon-datasets'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

create policy "Users can remove unsubmitted files from their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trustcarbon-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1
      from public.datasets
      where file_url = storage.objects.name
    )
  );
