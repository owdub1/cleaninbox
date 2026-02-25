import { useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all data through server-side API endpoints (authenticated via HTTP-only cookies)
      const [dashboardRes, sendersRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/api/user/dashboard-data`, { credentials: 'include' }),
        fetch(`${API_URL}/api/emails/senders`, { credentials: 'include' }),
        fetch(`${API_URL}/api/activity/get?limit=10`, { credentials: 'include' }),
      ]);

      // Process dashboard data (email accounts + user stats)
      let accountsData: any[] = [];
      let userStats = { unsubscribed: 0, emails_processed: 0 };

      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json();
        accountsData = dashData.emailAccounts || [];
        userStats = dashData.stats || userStats;
      }

      // Process senders for email counts
      let totalEmailsLoaded = 0;
      let emailCountsByAccount: Record<string, number> = {};
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json();
        sendersData.senders?.forEach((sender: any) => {
          const count = sender.emailCount || 0;
          totalEmailsLoaded += count;
          if (sender.accountEmail) {
            emailCountsByAccount[sender.accountEmail] = (emailCountsByAccount[sender.accountEmail] || 0) + count;
          }
        });
      }

      // Process activity
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }

      // Update stats
      setStats({
        emailsProcessed: totalEmailsLoaded,
        unsubscribed: userStats.unsubscribed || 0,
        deleted: userStats.emails_processed || 0,
        emailAccounts: accountsData.length
      });

      // Update email accounts - use actual sender counts instead of stored total_emails
      setEmailAccounts(accountsData.map((account: any) => ({
        id: account.id,
        email: account.email,
        provider: account.provider || 'Unknown',
        connection_status: account.connection_status || 'disconnected',
        lastSynced: account.last_synced || '',
        totalEmails: emailCountsByAccount[account.email] || 0,
        processedEmails: account.processed_emails || 0,
        unsubscribed: account.unsubscribed || 0
      })));

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

  return { stats, emailAccounts, recentActivity, loading, error, refetch: fetchDashboardData };
};
