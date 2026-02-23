# CleanInbox - Project Instructions

## Core Principle
**The app must mirror Gmail exactly.** Whatever Gmail displays, the app must display. No emails should slip through the cracks. This applies to all future email platforms too.

## Architecture

### Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Vercel serverless functions (Hobby plan = 10s timeout)
- **Database:** Supabase (PostgreSQL)
- **Email:** Gmail API (History API for incremental sync, full fetch for full sync)
- **Deployment:** Vercel (auto-deploys from `main`)

### Key Files
| Area | File(s) |
|------|---------|
| Sync engine | `api/emails/sync.ts` (main sync logic — incremental + full) |
| Gmail client | `api/lib/gmail-api.ts` |
| Senders API | `api/emails/senders.ts` |
| Outlook sync | `api/emails/outlook-sync.ts` |
| Main UI | `src/pages/EmailCleanup.tsx` |
| Auth | `api/auth/`, `api/lib/auth-middleware.ts` |

### Database Tables
- `emails` — individual emails synced from Gmail
- `email_senders` — aggregated sender stats (derived from `emails` table, recalculated per-sender after sync)

### Sync Flow
1. Incremental sync tries History API first (`storedHistoryId`)
2. Falls back to timestamp-based sync if history expired
3. `processNewMessages()` fetches and inserts new emails
4. `batchRecalculateSenderStats()` creates/updates sender rows
5. Post-sync loop applies unsubscribe + newsletter/promotional flags
6. `verifyCompletenessAndSync()` ensures no emails were missed
7. Recovery sync as last resort

## Hard Rules

### Vercel Hobby Plan (10s timeout)
- **Never** run full-table scans during incremental sync
- **Never** add always-running audits that page through all emails (~7000+)
- Keep serverless functions fast — batch DB operations, minimize round-trips
- No access to function logs; diagnostics must be returned in API response or shown in UI

### Supabase Gotchas
- **1000-row default limit:** `.select()` returns max 1000 rows. Must paginate in 1000-row chunks to get more. This silently drops data — no error thrown.
- **OFFSET pagination needs tiebreaker sort:** Always add `.order('id')` after the primary sort column when using `.range()`. Without it, PostgreSQL may skip rows at page boundaries.

### Gmail API
- `labelIds: ['INBOX']` (direct label lookup) is more reliable than `q: 'in:inbox'` (search index, can have delays)
- For `listMessages`, use `params.append` for repeated `labelIds` params, not comma-separated

## Conventions
- Commit messages: imperative mood, 1-2 sentence summary of "why"
- Don't show success notifications for sync — only show errors
- Newsletter tagging: `is_newsletter = CATEGORY_UPDATES && has_unsubscribe`, `is_promotional = CATEGORY_PROMOTIONS`

## Changelog
After every push to main, update `MEMORY.md` changelog at:
`/Users/christophercollin/.claude/projects/-Users-christophercollin-Desktop-cleaninbox/memory/MEMORY.md`
