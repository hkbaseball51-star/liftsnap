alter table profiles
  add column if not exists username text;

-- Case-insensitive uniqueness: two users cannot share a username differing only in case.
-- Empty string rows are excluded so that multiple users can have username = '' or null.
create unique index if not exists profiles_username_unique_idx
  on profiles (lower(username))
  where username is not null and username <> '';
