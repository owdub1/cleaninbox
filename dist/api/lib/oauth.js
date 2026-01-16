"use strict";
/**
 * OAuth Provider Integration Utilities
 *
 * Supports Google and GitHub OAuth 2.0 flows
 *
 * Setup:
 * 1. Google: https://console.cloud.google.com/apis/credentials
 *    - Create OAuth 2.0 Client ID
 *    - Add redirect URI: https://yourapp.com/api/auth/oauth/google/callback
 *    - Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env
 *
 * 2. GitHub: https://github.com/settings/developers
 *    - Create OAuth App
 *    - Add callback URL: https://yourapp.com/api/auth/oauth/github/callback
 *    - Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAuthUrl = getGoogleAuthUrl;
exports.getGoogleTokens = getGoogleTokens;
exports.getGoogleProfile = getGoogleProfile;
exports.getGitHubAuthUrl = getGitHubAuthUrl;
exports.getGitHubTokens = getGitHubTokens;
exports.getGitHubProfile = getGitHubProfile;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
/**
 * Generate OAuth authorization URL for Google
 */
function getGoogleAuthUrl() {
    const redirectUri = `${APP_URL}/api/auth/oauth/google/callback`;
    const scope = 'openid email profile';
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        access_type: 'offline',
        prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
/**
 * Exchange Google authorization code for tokens
 */
async function getGoogleTokens(code) {
    const redirectUri = `${APP_URL}/api/auth/oauth/google/callback`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!response.ok) {
        throw new Error('Failed to exchange authorization code for tokens');
    }
    return await response.json();
}
/**
 * Get Google user profile from access token
 */
async function getGoogleProfile(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch Google user profile');
    }
    const data = await response.json();
    return {
        id: data.id,
        email: data.email,
        firstName: data.given_name,
        lastName: data.family_name,
        name: data.name,
        picture: data.picture,
    };
}
/**
 * Generate OAuth authorization URL for GitHub
 */
function getGitHubAuthUrl() {
    const redirectUri = `${APP_URL}/api/auth/oauth/github/callback`;
    const scope = 'user:email';
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: scope,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
/**
 * Exchange GitHub authorization code for access token
 */
async function getGitHubTokens(code) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
        }),
    });
    if (!response.ok) {
        throw new Error('Failed to exchange authorization code for tokens');
    }
    return await response.json();
}
/**
 * Get GitHub user profile from access token
 */
async function getGitHubProfile(accessToken) {
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/json',
        },
    });
    if (!userResponse.ok) {
        throw new Error('Failed to fetch GitHub user profile');
    }
    const userData = await userResponse.json();
    // Get primary email if not public
    let email = userData.email;
    if (!email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });
        if (emailResponse.ok) {
            const emails = await emailResponse.json();
            const primaryEmail = emails.find((e) => e.primary);
            email = primaryEmail?.email || emails[0]?.email;
        }
    }
    const nameParts = userData.name?.split(' ') || [];
    return {
        id: userData.id.toString(),
        email: email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        name: userData.name,
        picture: userData.avatar_url,
    };
}
