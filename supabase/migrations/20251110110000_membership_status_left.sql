-- W38.8: a member who leaves keeps their row (content and audit stay attributed).
-- The new value is added alone: Postgres cannot use an enum value in the
-- transaction that adds it, so the functions and policies are in the next file.

alter type public.membership_status add value if not exists 'left';
