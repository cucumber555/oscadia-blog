-- OSCADIA Blog admin authorization fix
-- Run in the SAME Supabase project. Does not delete existing data.

create or replace function public.blog_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce((auth.jwt() ->> 'email'), '')) = 'cucu@oscadia.net';
$$;

grant execute on function public.blog_is_admin() to anon, authenticated;

alter table public.blog_profiles enable row level security;
drop policy if exists "blog admin can update profiles" on public.blog_profiles;
create policy "blog admin can update profiles"
on public.blog_profiles
for update
to authenticated
using (public.blog_is_admin())
with check (public.blog_is_admin());

alter table public.blog_posts enable row level security;
drop policy if exists "blog admin can delete posts" on public.blog_posts;
create policy "blog admin can delete posts"
on public.blog_posts
for delete
to authenticated
using (public.blog_is_admin());

alter table public.blog_comments enable row level security;
drop policy if exists "blog admin can delete comments" on public.blog_comments;
create policy "blog admin can delete comments"
on public.blog_comments
for delete
to authenticated
using (public.blog_is_admin());
