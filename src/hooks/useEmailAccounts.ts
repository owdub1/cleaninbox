import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

  const syncEmailAccount = async (accountId: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // Update last synced time
      const { data, error: updateError } = await supabase
        .from('email_accounts')
        .update({
          last_synced: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

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
