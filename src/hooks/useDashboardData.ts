import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    emailsProcessed: 0,
    unsubscribed: 0,
    emailAccounts: 0
  });
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If no stats exist, create them
      if (!statsData && !statsError) {
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert([{ user_id: user.id, emails_processed: 0, unsubscribed: 0 }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user stats:', createError);
        } else {
          setStats({
            emailsProcessed: 0,
            unsubscribed: 0,
            emailAccounts: 0
          });
        }
      } else if (statsError) {
        console.error('Error fetching stats:', statsError);
      }

      // Fetch email accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (accountsError) {
        console.error('Error fetching email accounts:', accountsError);
      }

      // Update stats only if we have valid statsData
      if (statsData) {
        setStats({
          emailsProcessed: statsData.emails_processed || 0,
          unsubscribed: statsData.unsubscribed || 0,
          emailAccounts: accountsData?.length || 0
        });
      }

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
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stats, emailAccounts, loading, error, refetch: fetchDashboardData };
};
