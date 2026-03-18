-- TeamSync Database Schema for Supabase

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text not null,
  photo_url text,
  role text default 'member' check (role in ('admin', 'member')),
  hubspot_token text,
  hubspot_enabled boolean default false,
  slack_token text,
  slack_enabled boolean default false,
  slack_completed_channel_id text default 'C0AMKG3RTL1',
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  urgency text default 'medium' check (urgency in ('low', 'medium', 'high')),
  status text default 'todo' check (status in ('todo', 'in-progress', 'done')),
  notes text[] default '{}',
  links text[] default '{}',
  documents text[] default '{}',
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Notes table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text default '',
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

-- RLS Policies: all authenticated users can read/write everything (team app)
create policy "Authenticated users can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Admins can delete profiles" on public.profiles for delete to authenticated using (true);

create policy "Authenticated users can view tasks" on public.tasks for select to authenticated using (true);
create policy "Authenticated users can create tasks" on public.tasks for insert to authenticated with check (true);
create policy "Authenticated users can update tasks" on public.tasks for update to authenticated using (true);
create policy "Authenticated users can delete tasks" on public.tasks for delete to authenticated using (true);

create policy "Authenticated users can view notes" on public.notes for select to authenticated using (true);
create policy "Authenticated users can create notes" on public.notes for insert to authenticated with check (true);
create policy "Authenticated users can update notes" on public.notes for update to authenticated using (true);
create policy "Authenticated users can delete notes" on public.notes for delete to authenticated using (true);

-- Enable realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notes;

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
