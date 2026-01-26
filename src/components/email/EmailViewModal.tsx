import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, User, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface EmailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  accountEmail: string;
  onDelete?: () => void;
}

interface FullEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  bodyHtml: string;
  isUnread: boolean;
  labels: string[];
}

const EmailViewModal: React.FC<EmailViewModalProps> = ({
  isOpen,
  onClose,
  messageId,
  accountEmail,
  onDelete,
}) => {
  const { token } = useAuth();
  const [email, setEmail] = useState<FullEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && messageId && accountEmail) {
      fetchEmail();
    }
  }, [isOpen, messageId, accountEmail]);

  const fetchEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/emails/get?messageId=${encodeURIComponent(messageId)}&accountEmail=${encodeURIComponent(accountEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch email');
      }

      const data = await response.json();
      setEmail(data.email);
    } catch (err: any) {
      console.error('Error fetching email:', err);
      setError(err.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseSenderName = (from: string) => {
    // Parse "Name <email@domain.com>" format
    const match = from.match(/^(?:"?(.+?)"?\s*)?<([^<>]+)>$/);
    if (match) {
      return {
        name: match[1] || match[2],
        email: match[2],
      };
    }
    return { name: from, email: from };
  };

  if (!isOpen) return null;

  const sender = email ? parseSenderName(email.from) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
            {loading ? 'Loading...' : email?.subject || 'Email'}
          </h2>
          <div className="flex items-center gap-2 ml-4">
            {onDelete && email && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete email"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="text-red-500 mb-4">
                <Mail className="w-12 h-12" />
              </div>
              <p className="text-gray-600 text-center">{error}</p>
              <button
                onClick={fetchEmail}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : email ? (
            <div className="p-6">
              {/* Email metadata */}
              <div className="mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{sender?.name}</div>
                    <div className="text-sm text-gray-500">{sender?.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 pl-13">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(email.date)}</span>
                </div>

                {email.to && (
                  <div className="text-sm text-gray-500 pl-13">
                    <span className="font-medium">To:</span> {email.to}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-4" />

              {/* Email body */}
              <div className="prose prose-sm max-w-none">
                {email.bodyHtml ? (
                  <div
                    className="email-content"
                    dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    style={{
                      // Contain email styles
                      all: 'initial',
                      display: 'block',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#374151',
                    }}
                  />
                ) : email.body ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                    {email.body}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No content available</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {email && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Message ID: {email.id}
              </div>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                Open in Gmail
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailViewModal;
