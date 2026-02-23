-- Delete user with email 3@email.com and all associated data
-- This will cascade delete to user_stats and email_accounts due to foreign key constraints

DELETE FROM public.users WHERE email = '3@email.com';

-- Verify deletion
SELECT * FROM public.users WHERE email = '3@email.com';
SELECT * FROM public.user_stats WHERE user_id IN (SELECT id FROM public.users WHERE email = '3@email.com');
SELECT * FROM public.email_accounts WHERE user_id IN (SELECT id FROM public.users WHERE email = '3@email.com');
