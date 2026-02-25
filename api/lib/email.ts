/**
 * Server-side Email Service for CleanInbox
 *
 * ALL transactional emails should use this module (not src/lib/email.ts).
 * Sends emails using Resend API.
 */

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'CleanInbox <noreply@cleaninbox.ca>';
const FRONTEND_URL = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'https://cleaninbox.vercel.app';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set. Email will not be sent.');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Shared email wrapper template
function wrapEmail(title: string, gradientFrom: string, gradientTo: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${title}</h1>
  </div>
  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    ${body}
  </div>
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>CleanInbox - Taking control of your inbox</p>
    <p>&copy; 2026 CleanInbox. All rights reserved.</p>
  </div>
</body>
</html>`;
}

/**
 * Send subscription confirmed email
 */
export async function sendSubscriptionConfirmedEmail(
  to: string,
  planName: string,
  isOnetime: boolean
): Promise<boolean> {
  const subject = `Welcome to CleanInbox ${planName}!`;

  const features = isOnetime
    ? `<li>Process up to 3,000 emails</li>
       <li>30 days of full access</li>
       <li>One-click unsubscribe</li>`
    : `<li>Full access to ${planName} features</li>
       <li>Automatic email syncing</li>
       <li>One-click unsubscribe</li>
       <li>Sender analytics</li>`;

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Thank you for subscribing to CleanInbox!</p>
    <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
      <p style="margin: 0; font-size: 16px; color: #065f46;">
        <strong>Your ${planName} plan is now active.</strong>
      </p>
    </div>
    <p style="font-size: 16px; margin-bottom: 10px;">Here's what you can do:</p>
    <ul style="font-size: 16px; line-height: 1.8;">
      ${features}
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        Go to Dashboard
      </a>
    </div>`;

  const html = wrapEmail('Subscription Confirmed', '#10b981', '#059669', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(
  to: string,
  accessUntilDate: string | null
): Promise<boolean> {
  const subject = 'Your CleanInbox subscription has been cancelled';

  const accessMessage = accessUntilDate
    ? `<p style="font-size: 16px; margin-bottom: 20px;">
         You'll continue to have access to your current plan features until <strong>${new Date(accessUntilDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
       </p>`
    : '';

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Your CleanInbox subscription has been cancelled.</p>
    ${accessMessage}
    <p style="font-size: 16px; margin-bottom: 20px;">
      After your access period ends, your account will revert to the Free plan.
    </p>
    <div style="background: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        Changed your mind? You can resubscribe anytime from the Pricing page.
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${FRONTEND_URL}/pricing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        View Plans
      </a>
    </div>`;

  const html = wrapEmail('Subscription Cancelled', '#6b7280', '#4b5563', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(to: string): Promise<boolean> {
  const subject = 'Action needed: Payment failed for CleanInbox';

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">We were unable to process your latest payment for CleanInbox.</p>
    <div style="background: #fef2f2; padding: 20px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 20px 0;">
      <p style="margin: 0; font-size: 16px; color: #991b1b;">
        <strong>Please update your payment method to avoid service interruption.</strong>
      </p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      If your payment method is not updated, your subscription may be cancelled and you'll lose access to your plan's features.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        Update Payment Method
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">
      If you believe this is an error, please contact us at support@cleaninbox.ca.
    </p>`;

  const html = wrapEmail('Payment Failed', '#ef4444', '#dc2626', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send contact form submission to support
 */
export async function sendContactFormEmail(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">New contact form submission:</p>
    <div style="background: #f9fafb; padding: 20px; border-radius: 6px; border-left: 4px solid #6366f1; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin: 0; font-size: 14px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    </div>
    <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Reply directly to this email to respond to the user.</p>`;

  const html = wrapEmail('New Contact Form Message', '#6366f1', '#4f46e5', body);
  return sendEmail({ to: 'support@cleaninbox.ca', subject: `[Contact] ${escapeHtml(subject)}`, html });
}

/**
 * Send auto-reply confirmation to user who submitted contact form
 */
export async function sendContactAutoReplyEmail(
  to: string,
  name: string
): Promise<boolean> {
  const subject = "We've received your message - CleanInbox";

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(name)},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thanks for reaching out! We've received your message and our team will get back to you within 24 hours.
    </p>
    <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        If your issue is urgent, feel free to reply to this email directly.
      </p>
    </div>
    <p style="font-size: 16px;">Best regards,<br>The CleanInbox Team</p>`;

  const html = wrapEmail('Message Received', '#10b981', '#059669', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send Quick Clean expiring warning email
 */
export async function sendQuickCleanExpiringEmail(
  to: string,
  daysRemaining: number,
  expiryDate: string
): Promise<boolean> {
  const subject = `Your Quick Clean access expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Just a heads up &mdash; your Quick Clean access is expiring soon.</p>
    <div style="background: #fffbeb; padding: 20px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 0; font-size: 16px; color: #92400e;">
        <strong>Access expires: ${new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
      </p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Make sure to finish your inbox cleanup before your access ends. After expiry, your account will revert to the Free plan.
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Want to keep going? Upgrade to a subscription plan for uninterrupted access.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${FRONTEND_URL}/pricing" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        View Subscription Plans
      </a>
    </div>`;

  const html = wrapEmail('Quick Clean Expiring Soon', '#f59e0b', '#d97706', body);
  return sendEmail({ to, subject, html });
}

// --- Auth emails (migrated from src/lib/email.ts) ---

interface VerificationEmailOptions {
  to: string;
  firstName: string;
  verificationUrl: string;
}

interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetUrl: string;
}

interface AccountLockedEmailOptions {
  to: string;
  firstName: string;
  lockedUntil: Date;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail({
  to,
  firstName,
  verificationUrl,
}: VerificationEmailOptions): Promise<boolean> {
  const subject = 'Verify your CleanInbox account';
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for signing up for CleanInbox! We're excited to help you take control of your inbox.
    </p>
    <p style="font-size: 16px; margin-bottom: 30px;">
      To get started, please verify your email address by clicking the button below:
    </p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        Verify Email Address
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 14px; color: #667eea; word-break: break-all;">
      ${verificationUrl}
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      This link will expire in 24 hours for security reasons.
    </p>
    <p style="font-size: 14px; color: #6b7280;">
      If you didn't create an account with CleanInbox, you can safely ignore this email.
    </p>`;

  const html = wrapEmail('Welcome to CleanInbox!', '#667eea', '#764ba2', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  firstName,
  resetUrl,
}: PasswordResetEmailOptions): Promise<boolean> {
  const subject = 'Reset your CleanInbox password';
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      We received a request to reset your password for your CleanInbox account.
    </p>
    <p style="font-size: 16px; margin-bottom: 30px;">
      Click the button below to choose a new password:
    </p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 14px; color: #667eea; word-break: break-all;">
      ${resetUrl}
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      This link will expire in 1 hour for security reasons.
    </p>
    <p style="font-size: 14px; color: #ef4444; background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
      <strong>Security Alert:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    </p>`;

  const html = wrapEmail('Password Reset Request', '#667eea', '#764ba2', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send account locked notification email
 */
export async function sendAccountLockedEmail({
  to,
  firstName,
  lockedUntil,
}: AccountLockedEmailOptions): Promise<boolean> {
  const subject = 'Your CleanInbox account has been locked';
  const lockDuration = Math.round((lockedUntil.getTime() - Date.now()) / (1000 * 60));

  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your CleanInbox account has been temporarily locked due to multiple failed login attempts.
    </p>
    <div style="background: #fef2f2; padding: 20px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 30px 0;">
      <p style="margin: 0; font-size: 16px; color: #991b1b;">
        <strong>Account Status:</strong> Locked for ${lockDuration} minutes
      </p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      This is a security measure to protect your account from unauthorized access.
    </p>
    <p style="font-size: 16px; margin-bottom: 30px;">
      <strong>What to do next:</strong>
    </p>
    <ul style="font-size: 16px; line-height: 1.8;">
      <li>Wait ${lockDuration} minutes before trying again</li>
      <li>Make sure you're using the correct password</li>
      <li>If you forgot your password, use the "Forgot Password" link</li>
      <li>If you didn't attempt to log in, contact support immediately</li>
    </ul>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      If you believe this is an error or if you're having trouble accessing your account, please contact our support team.
    </p>`;

  const html = wrapEmail('Security Alert', '#ef4444', '#dc2626', body);
  return sendEmail({ to, subject, html });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(to: string, firstName: string): Promise<boolean> {
  const subject = 'Your CleanInbox password was changed';
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      This email confirms that your CleanInbox password was changed successfully.
    </p>
    <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 30px 0;">
      <p style="margin: 0; font-size: 16px; color: #065f46;">
        Your password has been updated
      </p>
    </div>
    <p style="font-size: 14px; color: #ef4444; background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
      <strong>Important:</strong> If you didn't make this change, please contact our support team immediately and secure your account.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      For your security, you may want to:
    </p>
    <ul style="font-size: 14px; color: #6b7280; line-height: 1.8;">
      <li>Review your recent account activity</li>
      <li>Enable two-factor authentication (coming soon)</li>
      <li>Use a unique password for CleanInbox</li>
    </ul>`;

  const html = wrapEmail('Password Changed Successfully', '#10b981', '#059669', body);
  return sendEmail({ to, subject, html });
}
