import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

export interface DashboardStats {
  emailsProcessed: number;
  unsubscribed: number;
  deleted: number;
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

export interface ActivityItem {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const useDashboardData = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    emailsProcessed: 0,
    unsubscribed: 0,
    deleted: 0,
    emailAccounts: 0
  });
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
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

      // Fetch senders to get actual email count (same source as Email Cleanup page)
      const sendersResponse = await fetch(`${API_URL}/api/emails/senders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let totalEmailsLoaded = 0;
      if (sendersResponse.ok) {
        const sendersData = await sendersResponse.json();
        totalEmailsLoaded = sendersData.senders?.reduce(
          (sum: number, sender: any) => sum + (sender.emailCount || 0),
          0
        ) || 0;
      }

      // Get unsubscribed and deleted counts from user_stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('unsubscribed, emails_processed')
        .eq('user_id', user.id)
        .single();

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from('activity_log')
        .select('id, action_type, description, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(activityData || []);

      // Update stats
      setStats({
        emailsProcessed: totalEmailsLoaded,
        unsubscribed: userStats?.unsubscribed || 0,
        deleted: userStats?.emails_processed || 0,
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

  return { stats, emailAccounts, recentActivity, loading, error, refetch: fetchDashboardData };
};
