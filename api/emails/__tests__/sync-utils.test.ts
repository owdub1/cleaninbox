import { describe, it, expect, vi } from 'vitest';

// Mock all module-level dependencies before importing sync.ts
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));
vi.mock('../../lib/auth-middleware.js', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('../../lib/rate-limiter.js', () => ({
  rateLimit: vi.fn(() => vi.fn(() => false)),
}));
vi.mock('../../lib/gmail.js', () => ({
  getValidAccessToken: vi.fn(),
}));
vi.mock('../../lib/outlook.js', () => ({
  getValidOutlookAccessToken: vi.fn(),
}));
vi.mock('../../lib/gmail-api.js', () => ({
  listMessages: vi.fn(),
  batchGetMessages: vi.fn(),
  getProfile: vi.fn(),
  getHistoryChanges: vi.fn(),
}));
vi.mock('../outlook-sync.js', () => ({
  performOutlookFullSync: vi.fn(),
  performOutlookIncrementalSync: vi.fn(),
}));
vi.mock('../../subscription/get.js', () => ({
  PLAN_LIMITS: {},
}));
vi.mock('../../lib/sentry.js', () => ({
  withSentry: vi.fn((handler: any) => handler),
}));

import { parseSender, extractUnsubscribeLink, extractMailtoUnsubscribeLink } from '../sync.js';

describe('parseSender', () => {
  it('parses "Name <email>" format', () => {
    const result = parseSender('John Doe <john@example.com>');
    expect(result.senderEmail).toBe('john@example.com');
    expect(result.senderName).toBe('John Doe');
  });

  it('parses quoted "Name" <email> format', () => {
    const result = parseSender('"Jane Smith" <jane@example.com>');
    expect(result.senderEmail).toBe('jane@example.com');
    expect(result.senderName).toBe('Jane Smith');
  });

  it('parses <email> format (no name)', () => {
    const result = parseSender('<noreply@example.com>');
    expect(result.senderEmail).toBe('noreply@example.com');
  });

  it('parses bare email format', () => {
    const result = parseSender('user@example.com');
    expect(result.senderEmail).toBe('user@example.com');
  });

  it('lowercases the email', () => {
    const result = parseSender('User@Example.COM');
    expect(result.senderEmail).toBe('user@example.com');
  });

  it('handles empty string', () => {
    const result = parseSender('');
    expect(result.senderEmail).toBe('');
    expect(result.senderName).toBe('');
  });

  it('handles name with special characters', () => {
    const result = parseSender("O'Brien, Conan <conan@tbs.com>");
    expect(result.senderEmail).toBe('conan@tbs.com');
  });
});

describe('extractUnsubscribeLink', () => {
  it('extracts HTTP link in angle brackets', () => {
    const result = extractUnsubscribeLink('<https://example.com/unsubscribe>');
    expect(result).toBe('https://example.com/unsubscribe');
  });

  it('prefers HTTP link over mailto', () => {
    const result = extractUnsubscribeLink('<mailto:unsub@example.com>, <https://example.com/unsub>');
    expect(result).toBe('https://example.com/unsub');
  });

  it('extracts bare URL without angle brackets', () => {
    const result = extractUnsubscribeLink('https://example.com/unsubscribe');
    expect(result).toBe('https://example.com/unsubscribe');
  });

  it('extracts mailto if no HTTP link present', () => {
    const result = extractUnsubscribeLink('<mailto:unsubscribe@example.com>');
    expect(result).toBe('mailto:unsubscribe@example.com');
  });

  it('extracts bare mailto', () => {
    const result = extractUnsubscribeLink('mailto:unsub@example.com');
    expect(result).toBe('mailto:unsub@example.com');
  });

  it('returns null for empty header', () => {
    expect(extractUnsubscribeLink('')).toBeNull();
  });

  it('returns null for null-like input', () => {
    expect(extractUnsubscribeLink(null as any)).toBeNull();
  });
});

describe('extractMailtoUnsubscribeLink', () => {
  it('extracts mailto in angle brackets', () => {
    const result = extractMailtoUnsubscribeLink('<mailto:unsub@example.com>');
    expect(result).toBe('mailto:unsub@example.com');
  });

  it('extracts mailto from mixed header', () => {
    const result = extractMailtoUnsubscribeLink('<https://example.com/unsub>, <mailto:unsub@example.com>');
    expect(result).toBe('mailto:unsub@example.com');
  });

  it('extracts bare mailto', () => {
    const result = extractMailtoUnsubscribeLink('mailto:unsub@example.com');
    expect(result).toBe('mailto:unsub@example.com');
  });

  it('returns null when no mailto present', () => {
    const result = extractMailtoUnsubscribeLink('<https://example.com/unsub>');
    expect(result).toBeNull();
  });

  it('returns null for empty header', () => {
    expect(extractMailtoUnsubscribeLink('')).toBeNull();
  });

  it('returns null for null-like input', () => {
    expect(extractMailtoUnsubscribeLink(null as any)).toBeNull();
  });
});
