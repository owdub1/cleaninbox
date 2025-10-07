# Project Rules

## Data Storage

**IMPORTANT**: Always use Supabase database for data storage. Never use localStorage, sessionStorage, or any browser-based storage APIs.

- ✅ Use Supabase for all data persistence
- ❌ Do not use `localStorage`
- ❌ Do not use `sessionStorage`
- ❌ Do not use IndexedDB
- ❌ Do not use cookies for data storage

All data should be stored in and retrieved from the Supabase database using the configured client at `src/lib/supabase.ts`.
