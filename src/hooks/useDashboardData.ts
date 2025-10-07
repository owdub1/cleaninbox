import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user stats
        const { data: statsData, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError) throw statsError;

        // Fetch email accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (accountsError) throw accountsError;

        // Update stats
        setStats({
          emailsProcessed: statsData?.emails_processed || 0,
          unsubscribed: statsData?.unsubscribed || 0,
          emailAccounts: accountsData?.length || 0
        });

        // Update email accounts
        setEmailAccounts(accountsData?.map(account => ({
          id: account.id,
          email: account.email,
          provider: account.provider || 'Unknown',
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
    };

    fetchDashboardData();
  }, [user]);

  return { stats, emailAccounts, loading, error };
};
