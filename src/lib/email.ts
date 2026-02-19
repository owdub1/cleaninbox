/**
 * Email Service for CleanInbox
 *
 * This module handles sending transactional emails using Resend.
 * Resend is a modern email API that's simple, affordable, and reliable.
 *
 * Setup:
 * 1. Sign up at https://resend.com
 * 2. Get your API key from the dashboard
 * 3. Add RESEND_API_KEY to your .env file
 * 4. Verify your sending domain
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'CleanInbox <support@cleaninbox.ca>';

/**
 * Send email using Resend API
 */
async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set. Email will not be sent.');
    console.log('Email that would be sent:', { to, subject });
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
        from: from || FROM_EMAIL,
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

    const data: any = await response.json();
    console.log('Email sent successfully:', data.id);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
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
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to CleanInbox!</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

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
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>CleanInbox - Taking control of your inbox</p>
    <p>© 2026 CleanInbox. All rights reserved.</p>
  </div>
</body>
</html>
`;

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
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

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
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>CleanInbox - Taking control of your inbox</p>
    <p>© 2026 CleanInbox. All rights reserved.</p>
  </div>
</body>
</html>
`;

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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account locked</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Security Alert</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

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
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>CleanInbox - Taking control of your inbox</p>
    <p>© 2026 CleanInbox. All rights reserved.</p>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(to: string, firstName: string): Promise<boolean> {
  const subject = 'Your CleanInbox password was changed';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password changed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Password Changed Successfully</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      This email confirms that your CleanInbox password was changed successfully.
    </p>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 30px 0;">
      <p style="margin: 0; font-size: 16px; color: #065f46;">
        <strong>✓</strong> Your password has been updated
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
    </ul>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>CleanInbox - Taking control of your inbox</p>
    <p>© 2026 CleanInbox. All rights reserved.</p>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}
