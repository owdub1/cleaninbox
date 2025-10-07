# Database Setup Instructions

## Setting up Supabase Tables

To ensure new users start with zero stats instead of mock data, you need to run the SQL schema in your Supabase database.

### Steps:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/clryyrrhbadvfdgtwvad

2. Navigate to **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy the entire contents of `supabase-schema.sql` file

5. Paste it into the SQL editor

6. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### What this does:

- Creates `user_stats` table to track emails processed and unsubscribed count
- Creates `email_accounts` table to store connected email accounts
- Sets up Row Level Security (RLS) policies to ensure users can only access their own data
- Creates a trigger that automatically initializes user_stats with zeros when a new user signs up
- Ensures all new accounts start with:
  - 0 emails processed
  - 0 unsubscribed
  - 0 email accounts

### Verification:

After running the schema, new users will see:
- **Emails Processed**: 0
- **Unsubscribed**: 0
- **Email Accounts**: 0

Instead of the old mock data (1245, 87, 2).
