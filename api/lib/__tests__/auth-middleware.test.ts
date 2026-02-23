import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

import jwt from 'jsonwebtoken';
import { extractToken, requireAuth } from '../auth-middleware.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function mockRequest(authHeader?: string): VercelRequest {
  return {
    headers: {
      authorization: authHeader,
    },
  } as any;
}

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as VercelResponse;
}

describe('extractToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no Authorization header', () => {
    const req = mockRequest(undefined);
    expect(extractToken(req)).toBeNull();
  });

  it('returns null when Authorization header does not start with Bearer', () => {
    const req = mockRequest('Basic abc123');
    expect(extractToken(req)).toBeNull();
  });

  it('returns decoded token for valid JWT', () => {
    const payload = { userId: '123', email: 'test@test.com' };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    const req = mockRequest('Bearer valid-token');
    const result = extractToken(req);
    expect(result).toEqual(payload);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
  });

  it('returns null for expired/invalid JWT', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = mockRequest('Bearer expired-token');
    expect(extractToken(req)).toBeNull();
  });

  it('returns null for malformed token', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = mockRequest('Bearer not-a-jwt');
    expect(extractToken(req)).toBeNull();
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user for valid token', () => {
    const payload = { userId: '123', email: 'test@test.com', emailVerified: true };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    const req = mockRequest('Bearer valid-token');
    const res = mockResponse();
    const result = requireAuth(req as any, res);

    expect(result).toEqual({
      userId: '123',
      email: 'test@test.com',
      emailVerified: true,
    });
  });

  it('returns 401 for missing token', () => {
    const req = mockRequest(undefined);
    const res = mockResponse();
    const result = requireAuth(req as any, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  });

  it('returns 401 for expired token', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = mockRequest('Bearer expired');
    const res = mockResponse();
    const result = requireAuth(req as any, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when decoded token has no userId', () => {
    vi.mocked(jwt.verify).mockReturnValue({ email: 'test@test.com' } as any);

    const req = mockRequest('Bearer no-userid');
    const res = mockResponse();
    const result = requireAuth(req as any, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
