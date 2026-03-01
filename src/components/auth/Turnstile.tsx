import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Cloudflare Turnstile CAPTCHA Component
 *
 * Usage:
 * <Turnstile onVerify={(token) => setToken(token)} />
 *
 * Get your site key:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Select Turnstile
 * 3. Create a site
 * 4. Add VITE_TURNSTILE_SITE_KEY to .env
 *
 * Test keys (always pass):
 * Site key: 1x00000000000000000000AA
 * Secret key: 1x0000000000000000000000000000000AA
 */

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

// Test site key (always passes - replace with your own in production)
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export interface TurnstileRef {
  reset: () => void;
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(({
  onVerify,
  onError,
  onExpire,
  theme: themeProp = 'auto',
  size = 'normal'
}, ref) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    }
  }));

  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        renderWidget();
      };
    } else {
      renderWidget();
    }

    return () => {
      // Cleanup widget on unmount
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, []);

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile) return;

    // Remove existing widget if present
    if (widgetId.current) {
      window.turnstile.remove(widgetId.current);
    }

    // Render new widget
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: themeProp === 'auto' ? theme : themeProp,
      size: size,
      callback: (token: string) => {
        onVerify(token);
      },
      'error-callback': () => {
        onError?.();
      },
      'expired-callback': () => {
        onExpire?.();
      },
    });
  };

  return <div ref={containerRef} />;
});

export default Turnstile;

// Extend Window interface for TypeScript
declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: any) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}
