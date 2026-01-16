import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { validateEmail, validatePassword, hashPassword, sanitizeInput, generateToken, getExpirationDate } from '../lib/auth-utils.js';
import { sendVerificationEmail } from '../../src/lib/email.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { issueCSRFToken } from '../lib/csrf.js';
import { verifyTurnstile } from '../lib/turnstile.js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const EMAIL_VERIFICATION_EXPIRY = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '24h';
// Rate limit: 3 signups per hour per IP
const limiter = rateLimit(RateLimitPresets.SIGNUP);
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Apply rate limiting
    if (limiter(req, res))
        return;
    try {
        const { email, password, firstName, lastName, captchaToken } = req.body;
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Verify Turnstile CAPTCHA
        const captchaValid = await verifyTurnstile(captchaToken, req);
        if (!captchaValid) {
            return res.status(400).json({
                error: 'CAPTCHA verification failed. Please try again.',
                code: 'CAPTCHA_FAILED'
            });
        }
        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                errors: passwordValidation.errors
            });
        }
        // Sanitize inputs
        const sanitizedEmail = sanitizeInput(email.toLowerCase());
        const sanitizedFirstName = firstName ? sanitizeInput(firstName) : null;
        const sanitizedLastName = lastName ? sanitizeInput(lastName) : null;
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', sanitizedEmail)
            .single();
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }
        // Hash password
        const passwordHash = await hashPassword(password, 10);
        // Create user (email_verified defaults to false)
        const { data: user, error } = await supabase
            .from('users')
            .insert([
            {
                email: sanitizedEmail,
                password_hash: passwordHash,
                first_name: sanitizedFirstName,
                last_name: sanitizedLastName,
                email_verified: false
            },
        ])
            .select()
            .single();
        if (error) {
            console.error('User creation error:', error);
            throw error;
        }
        // Add initial password to history
        await supabase
            .rpc('add_password_to_history', {
            p_user_id: user.id,
            p_password_hash: passwordHash,
            p_max_history: 10
        });
        // Generate email verification token
        const verificationToken = generateToken();
        const verificationExpiresAt = getExpirationDate(EMAIL_VERIFICATION_EXPIRY);
        const { error: tokenError } = await supabase
            .from('email_verification_tokens')
            .insert([{
                user_id: user.id,
                token: verificationToken,
                expires_at: verificationExpiresAt.toISOString()
            }]);
        if (tokenError) {
            console.error('Token creation error:', tokenError);
            // Don't fail signup if email can't be sent
        }
        // Send verification email
        const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
        const emailSent = await sendVerificationEmail({
            to: user.email,
            firstName: user.first_name || 'there',
            verificationUrl
        });
        if (!emailSent) {
            console.error('Failed to send verification email to:', user.email);
        }
        // Generate JWT (short-lived access token)
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            emailVerified: user.email_verified
        }, JWT_SECRET);
        // Issue CSRF token for security
        const csrfToken = issueCSRFToken(res);
        return res.status(201).json({
            token,
            csrfToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                emailVerified: user.email_verified
            },
            message: 'Account created successfully! Please check your email to verify your account.'
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
