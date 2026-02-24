/**
 * Log User Activity Endpoint
 *
 * POST /api/activity/log
 *
 * Records user activity to the database for Recent Activity display.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../lib/env.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = requireEnv('JWT_SECRET');

interface JWTPayload {
  userId: string;
  email: string;
}

export interface ActivityLogEntry {
  action_type: 'email_sync' | 'unsubscribe' | 'delete' | 'archive' | 'account_connect' | 'account_disconnect' | 'subscription_change';
  description: string;
  metadata?: Record<string, any>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const { action_type, description, metadata } = req.body as ActivityLogEntry;

    if (!action_type || !description) {
      return res.status(400).json({ error: 'action_type and description are required' });
    }

    // Insert activity log entry
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: decoded.userId,
        action_type,
        description,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      return res.status(500).json({ error: 'Failed to log activity' });
    }

    return res.status(201).json({ success: true, activity: data });

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error in activity/log:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to log activity from other API endpoints
export async function logActivity(
  userId: string,
  actionType: ActivityLogEntry['action_type'],
  description: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action_type: actionType,
        description,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
