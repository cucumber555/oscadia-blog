-- OSCADIA Blog v2 migration. Run on the SAME Supabase project as OSCADIA.
-- Requires the original starter schema (blog_profiles, blog_posts, blog_attachments, blog_likes, blog_comments).
create extension if not exists pgcrypto;

create table if not exists public.blog_follows (
  follower_id uuid not null references public.blog_profiles(id) on delete cascade,
  followed_id uuid not null references public.blog_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint blog_no_self_follow check (follower_id <> followed_id)
);
create index if not exists blog_follows_followed_idx on public.blog_follows(followed_id, created_at desc);
create index if not exists blog_follows_follower_idx on public.blog_follows(follower_id, created_at desc);

alter table public.blog_follows enable row level security;
drop policy if exists "follow relationships are public" on public.blog_follows;
create policy "follow relationships are public" on public.blog_follows for select using (true);
drop policy if exists "members follow as themselves" on public.blog_follows;
create policy "members follow as themselves" on public.blog_follows for insert to authenticated
with check (follower_id = auth.uid() and follower_id <> followed_id);
drop policy if exists "members unfollow themselves" on public.blog_follows;
create policy "members unfollow themselves" on public.blog_follows for delete to authenticated
using (follower_id = auth.uid() or public.blog_is_admin());

-- Only admin can change username or badge fields. Personal badge approval also
-- requires 100 followers, except the admin account. This is enforced server-side.
create or replace function public.blog_protect_profile_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_email text;
declare follower_count bigint;
begin
  if new.username is distinct from old.username and not public.blog_is_admin() then
    raise exception 'Only the administrator can change usernames.';
  end if;
  if (new.badge_type is distinct from old.badge_type or new.badge_approved is distinct from old.badge_approved)
     and not public.blog_is_admin() then
    raise exception 'Only the administrator can approve badges.';
  end if;
  if new.badge_type = 'personal' and new.badge_approved then
    select u.email into target_email from auth.users u where u.id = new.id;
    select count(*) into follower_count from public.blog_follows f where f.followed_id = new.id;
    if lower(coalesce(target_email,'')) <> 'cucu@oscadia.net' and follower_count < 100 then
      raise exception 'A personal badge requires at least 100 followers and administrator approval.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists blog_profiles_protect_fields on public.blog_profiles;
create trigger blog_profiles_protect_fields before update on public.blog_profiles
for each row execute function public.blog_protect_profile_fields();

-- The existing bucket is public because posts are public. Expand it to video and 50MB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blog-attachments','blog-attachments',true,52428800,
  array['image/*','video/*','application/pdf','text/plain','text/csv','application/zip',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=true,file_size_limit=52428800,
allowed_mime_types=excluded.allowed_mime_types;

-- Existing "members upload own blog attachments" policy already allows uploads
-- under a user's own UUID folder, which also supports profile-avatar paths.
-- Public bucket means public URLs are readable by everyone. Do not upload private files.

-- To approve an eligible personal badge, run as administrator in SQL Editor:
-- update public.blog_profiles set badge_type='personal', badge_approved=true where username='some_username';
-- To set an official badge:
-- update public.blog_profiles set badge_type='official', badge_approved=false where username='oscadia';
