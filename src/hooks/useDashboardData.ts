import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

export interface DashboardStats {
  emailsProcessed: number;
  unsubscribed: number;
  emailAccounts: number;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  connection_status: string;
  lastSynced: string;
  totalEmails: number;
  processedEmails: number;
  unsubscribed: number;
}

export const useDashboardData = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    emailsProcessed: 0,
    unsubscribed: 0,
    emailAccounts: 0
  });
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch email accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (accountsError) {
        console.error('Error fetching email accounts:', accountsError);
      }

      // Calculate total emails from email_accounts.total_emails
      // This is updated by the sync endpoint to reflect actual emails in app
      const totalEmailsLoaded = accountsData?.reduce(
        (sum, account) => sum + (account.total_emails || 0),
        0
      ) || 0;

      // Get unsubscribed count from user_stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('unsubscribed')
        .eq('user_id', user.id)
        .single();

      // Update stats
      setStats({
        emailsProcessed: totalEmailsLoaded,
        unsubscribed: userStats?.unsubscribed || 0,
        emailAccounts: accountsData?.length || 0
      });

      // Update email accounts
      setEmailAccounts(accountsData?.map(account => ({
        id: account.id,
        email: account.email,
        provider: account.provider || 'Unknown',
        connection_status: account.connection_status || 'disconnected',
        lastSynced: account.last_synced || '',
        totalEmails: account.total_emails || 0,
        processedEmails: account.processed_emails || 0,
        unsubscribed: account.unsubscribed || 0
      })) || []);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stats, emailAccounts, loading, error, refetch: fetchDashboardData };
};
