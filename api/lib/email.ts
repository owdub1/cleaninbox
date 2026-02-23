/**
 * Server-side Email Service for CleanInbox
 *
 * Sends transactional emails for subscription events using Resend API.
 * Used by webhook handlers and other server-side code.
 */

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

    const data: any = await response.json();
    console.log('Email sent successfully:', data.id);
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
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; font-size: 14px;"><strong>Subject:</strong> ${subject}</p>
    </div>
    <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Reply directly to this email to respond to the user.</p>`;

  const html = wrapEmail('New Contact Form Message', '#6366f1', '#4f46e5', body);
  return sendEmail({ to: 'support@cleaninbox.ca', subject: `[Contact] ${subject}`, html });
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
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
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
