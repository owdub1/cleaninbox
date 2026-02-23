/**
 * Contact Form Endpoint
 *
 * POST /api/contact/send
 *
 * Accepts contact form submissions and sends emails.
 * Rate limited to prevent spam (5 requests per 10 minutes per IP).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../lib/rate-limiter.js';
import { sendContactFormEmail, sendContactAutoReplyEmail } from '../lib/email.js';

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many messages sent. Please try again in a few minutes.',
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await limiter(req, res)) return;

  const { name, email, subject, message } = req.body || {};

  // Validate all fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  if (typeof subject !== 'string' || subject.trim().length === 0) {
    return res.status(400).json({ error: 'Subject is required' });
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Send email to support
    const sent = await sendContactFormEmail(
      name.trim(),
      email.trim(),
      subject.trim(),
      message.trim()
    );

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }

    // Send auto-reply to user (fire and forget — don't block on failure)
    sendContactAutoReplyEmail(email.trim(), name.trim()).catch(err =>
      console.error('Failed to send auto-reply:', err)
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
