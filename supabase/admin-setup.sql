-- ONE-TIME SETUP: make your existing Supabase user an administrator.
--
-- 1. In Supabase, open  SQL Editor  and paste this file.
-- 2. Replace owner@example.com with the email of the user you already created
--    (Authentication -> Users). Never put a password in this file.
-- 3. Run it. It is safe to run again.
--
-- Until this has been run, that user can sign in but will be told they do not have admin access.

insert into public.admin_users (user_id, email)
select id, email
  from auth.users
 where lower(email) = lower('tint-blame-applaud@duck.com')
on conflict (user_id) do nothing;

-- Check it worked (should return one row):
select user_id, email, created_at from public.admin_users;
