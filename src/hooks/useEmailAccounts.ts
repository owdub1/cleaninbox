import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

export const useEmailAccounts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEmailAccount = async (email: string, provider: string = 'Gmail') => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('email_accounts')
        .insert([
          {
            user_id: user.id,
            email: email,
            provider: provider,
            last_synced: new Date().toISOString(),
            total_emails: 0,
            processed_emails: 0,
            unsubscribed: 0
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: any) {
      console.error('Error adding email account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeEmailAccount = async (accountId: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return true;
    } catch (err: any) {
      console.error('Error removing email account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncEmailAccount = async (
    accountId: string,
    email?: string,
    options: { fullSync?: boolean } = {}
  ) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { fullSync = false } = options;

    try {
      setLoading(true);
      setError(null);

      // Get the email address if not provided
      let emailAddress = email;
      if (!emailAddress) {
        const { data: account } = await supabase
          .from('email_accounts')
          .select('email')
          .eq('id', accountId)
          .single();
        emailAddress = account?.email;
      }

      if (!emailAddress) {
        throw new Error('Email account not found');
      }

      // Call the actual sync API
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/emails/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email: emailAddress, fullSync })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync emails');
      }

      return data;
    } catch (err: any) {
      console.error('Error syncing email account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addEmailAccount,
    removeEmailAccount,
    syncEmailAccount,
    loading,
    error
  };
};
