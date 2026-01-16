import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// Import API handlers
import signup from './api/auth/signup.js';
import login from './api/auth/login.js';
import verifyEmail from './api/auth/verify-email.js';
import resendVerification from './api/auth/resend-verification.js';
import forgotPassword from './api/auth/forgot-password.js';
import resetPassword from './api/auth/reset-password.js';
import refresh from './api/auth/refresh.js';
const app = express();
const PORT = process.env.PORT || 3001;
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'https://cleaninbox.vercel.app',
    process.env.FRONTEND_URL || ''
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'cleaninbox-api'
    });
});
// Wrapper to convert Vercel handlers to Express handlers
const wrapHandler = (handler) => {
    return async (req, res) => {
        try {
            await handler(req, res);
        }
        catch (error) {
            console.error('Handler error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal server error',
                    message: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    };
};
// Auth routes
app.post('/api/auth/signup', wrapHandler(signup));
app.post('/api/auth/login', wrapHandler(login));
app.post('/api/auth/verify-email', wrapHandler(verifyEmail));
app.get('/api/auth/verify-email', wrapHandler(verifyEmail));
app.post('/api/auth/resend-verification', wrapHandler(resendVerification));
app.post('/api/auth/forgot-password', wrapHandler(forgotPassword));
app.post('/api/auth/reset-password', wrapHandler(resetPassword));
app.post('/api/auth/refresh', wrapHandler(refresh));
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 CleanInbox API running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
export default app;
