-- Add profile photo URL fields to users and students

alter table public.users
  add column photo_url text;

alter table public.students
  add column photo_url text;

-- Create storage bucket for user photos if it doesn't exist
-- This should be done via Supabase dashboard or SDK, not via SQL
