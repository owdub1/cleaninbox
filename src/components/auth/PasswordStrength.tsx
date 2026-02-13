import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface ValidationRule {
  label: string;
  valid: boolean;
}

/**
 * PasswordStrength Component
 *
 * Displays password strength indicator and validation requirements
 */
const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  // Calculate password strength score (0-100)
  const calculateStrength = (): number => {
    let score = 0;

    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    return Math.min(score, 100);
  };

  // Get validation rules
  const getValidationRules = (): ValidationRule[] => {
    return [
      {
        label: 'At least 8 characters',
        valid: password.length >= 8
      },
      {
        label: 'Contains uppercase letter',
        valid: /[A-Z]/.test(password)
      },
      {
        label: 'Contains lowercase letter',
        valid: /[a-z]/.test(password)
      },
      {
        label: 'Contains number',
        valid: /[0-9]/.test(password)
      },
      {
        label: 'Contains special character',
        valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      }
    ];
  };

  const strength = calculateStrength();
  const rules = getValidationRules();

  // Determine strength level and color
  const getStrengthInfo = () => {
    if (strength === 0) {
      return { label: '', color: 'bg-gray-200', textColor: 'text-gray-500' };
    } else if (strength < 40) {
      return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' };
    } else if (strength < 70) {
      return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    } else if (strength < 90) {
      return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    } else {
      return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' };
    }
  };

  const strengthInfo = getStrengthInfo();

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Strength bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">Password strength:</span>
          {strengthInfo.label && (
            <span className={`text-sm font-medium ${strengthInfo.textColor}`}>
              {strengthInfo.label}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strengthInfo.color}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Validation rules */}
      <div className="space-y-1">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center text-sm">
            {rule.valid ? (
              <svg
                className="h-4 w-4 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-gray-300 dark:text-gray-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={rule.valid ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
