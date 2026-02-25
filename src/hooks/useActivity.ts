import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface Activity {
  id: string;
  action_type: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function useActivity(limit: number = 10) {
  const { isAuthenticated, refreshToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!isAuthenticated) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/activity/get?limit=${limit}`, {
        method: 'GET',
      }, refreshToken);

      if (!response.ok) {
        if (response.status === 401) {
          setActivities([]);
          return;
        }
        throw new Error('Failed to fetch activity');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching activity:', err);
      setError(err.message);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [limit, isAuthenticated, refreshToken]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const logActivity = useCallback(async (
    actionType: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    if (!isAuthenticated) return;

    try {
      await fetchWithAuth(`/api/activity/log`, {
        method: 'POST',
        body: JSON.stringify({
          action_type: actionType,
          description,
          metadata
        })
      }, refreshToken);

      // Refetch to update the list
      fetchActivity();
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, [fetchActivity, isAuthenticated, refreshToken]);

  // Format relative time (e.g., "2 hours ago", "Yesterday at 2:30 PM")
  const formatRelativeTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }, []);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivity,
    logActivity,
    formatRelativeTime
  };
}
