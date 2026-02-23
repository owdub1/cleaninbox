import React, { useState } from 'react';
import { Sender } from '../../../hooks/useEmailSenders';

const SenderAvatar = ({ sender }: { sender: Sender }) => {
  const [imgError, setImgError] = useState(false);

  const domain = sender.email.split('@')[1];
  const logoUrl = `https://logo.clearbit.com/${domain}`;

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(p => p && /[a-zA-Z]/.test(p[0]));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const letters = name.replace(/[^a-zA-Z]/g, '');
    return (letters.slice(0, 2) || '?').toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500',
      'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-indigo-500', 'bg-violet-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (imgError) {
    return (
      <div className={`w-12 h-12 rounded-full ${getAvatarColor(sender.email)} flex items-center justify-center text-white font-semibold text-base flex-shrink-0`}>
        {getInitials(sender.name || sender.email)}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={sender.name}
      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
};

export default SenderAvatar;
