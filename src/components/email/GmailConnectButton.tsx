import { useState } from 'react';
import { useGmailConnection } from '../../hooks/useGmailConnection';

interface GmailConnectButtonProps {
  onConnect?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const GmailConnectButton = ({
  onConnect,
  onError,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
}: GmailConnectButtonProps) => {
  const { connectGmail, loading, error } = useGmailConnection();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const authUrl = await connectGmail();
      if (authUrl) {
        onConnect?.();
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else if (error) {
        onError?.(error);
      }
    } catch (err: any) {
      onError?.(err.message || 'Failed to connect Gmail');
    } finally {
      setConnecting(false);
    }
  };

  const isLoading = loading || connecting;

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30',
  };

  return (
    <button
      onClick={handleConnect}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {/* Gmail Icon */}
      <svg
        className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
      </svg>

      {isLoading ? (
        <>
          <svg
            className="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <span>Connect with Gmail</span>
      )}
    </button>
  );
};

export default GmailConnectButton;
