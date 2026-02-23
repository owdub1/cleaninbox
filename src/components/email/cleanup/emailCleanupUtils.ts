import { Sender } from '../../../hooks/useEmailSenders';

export interface UndoAction {
  id: string;
  type: 'delete' | 'archive';
  count: number;
  senderEmails: string[];
  messageIds?: string[];
  timestamp: number;
}

export interface PendingDeletion {
  id: string;
  type: 'single' | 'bulk';
  action: 'delete' | 'archive';
  email?: import('../../../hooks/useEmailSenders').EmailMessage;
  senderEmail?: string;
  senderName?: string;
  senderKey?: string;
  originalEmails?: import('../../../hooks/useEmailSenders').EmailMessage[];
  originalSenderCount?: number;
  originalLastEmailDate?: string;
  senders?: Sender[];
  senderEmails?: string[];
  senderNames?: string[];
  timeoutId: ReturnType<typeof setTimeout>;
}

export const getSenderKey = (sender: Sender): string => `${sender.name}|||${sender.email}`;

export const getStalenessBadge = (lastEmailDate: string): { label: string; className: string } | null => {
  const lastDate = new Date(lastEmailDate);
  const now = new Date();
  const monthsAgo = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo > 24) {
    const year = lastDate.getFullYear();
    return { label: `Last email ${year}`, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  }
  if (monthsAgo > 12) {
    return { label: 'Over 1 year ago', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  if (monthsAgo > 6) {
    return { label: 'Over 6 months ago', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  }
  return null;
};

export function filterAndSortSenders(
  senderList: Sender[],
  searchTerm: string,
  sortBy: string,
  sortDirection: string,
  selectedAccountEmail: string | null,
  multipleAccounts: boolean,
  overrideSort?: { by: string; direction: string }
): Sender[] {
  let filtered = [...senderList];

  if (selectedAccountEmail && multipleAccounts) {
    filtered = filtered.filter(item => item.accountEmail === selectedAccountEmail);
  }

  filtered = filtered.filter(item => item.emailCount > 0);

  if (searchTerm) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const effectiveSortBy = overrideSort?.by ?? sortBy;
  const effectiveDirection = overrideSort?.direction ?? sortDirection;

  filtered.sort((a, b) => {
    if (effectiveSortBy === 'name') {
      return effectiveDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (effectiveSortBy === 'date') {
      const dateCompare = effectiveDirection === 'asc'
        ? new Date(a.lastEmailDate).getTime() - new Date(b.lastEmailDate).getTime()
        : new Date(b.lastEmailDate).getTime() - new Date(a.lastEmailDate).getTime();
      if (dateCompare === 0) return b.emailCount - a.emailCount;
      return dateCompare;
    } else {
      return effectiveDirection === 'asc' ? a.emailCount - b.emailCount : b.emailCount - a.emailCount;
    }
  });

  return filtered;
}

export function getSendersByTimePeriod(senders: Sender[]): { period: string; senders: Sender[]; sortOrder: number }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const grouped: Record<string, { senders: Sender[]; sortOrder: number }> = {};

  for (const sender of senders) {
    const emailDate = new Date(sender.lastEmailDate);
    const emailYear = emailDate.getFullYear();
    const emailMonth = emailDate.getMonth();
    const emailDayOfMonth = emailDate.getDate();
    const emailDayStart = new Date(emailYear, emailMonth, emailDayOfMonth, 0, 0, 0, 0).getTime();
    const msDiff = todayStart - emailDayStart;
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    let period: string;
    let sortOrder: number;

    if (daysDiff === 0) {
      period = 'Today';
      sortOrder = 0;
    } else if (daysDiff === 1) {
      period = 'Yesterday';
      sortOrder = 1;
    } else if (daysDiff >= 2 && daysDiff <= 6) {
      period = dayNames[emailDate.getDay()];
      sortOrder = daysDiff;
    } else if (daysDiff >= 7 && daysDiff <= 30) {
      if (daysDiff <= 13) {
        period = 'Last Week';
        sortOrder = 10;
      } else {
        period = 'Earlier This Month';
        sortOrder = 15;
      }
    } else if (emailYear === currentYear) {
      period = monthNames[emailMonth];
      sortOrder = 20 + (currentMonth - emailMonth);
    } else if (emailYear === currentYear - 1) {
      period = `${monthNames[emailMonth]} ${emailYear}`;
      sortOrder = 100 + (11 - emailMonth);
    } else {
      period = emailYear.toString();
      sortOrder = 200 + (currentYear - emailYear);
    }

    if (!grouped[period]) {
      grouped[period] = { senders: [], sortOrder };
    }
    grouped[period].senders.push(sender);
  }

  return Object.entries(grouped)
    .map(([period, data]) => ({ period, senders: data.senders, sortOrder: data.sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function filterPendingBulkDeletions(
  senderList: Sender[],
  pendingDeletions: Map<string, PendingDeletion>
): Sender[] {
  if (pendingDeletions.size === 0) return senderList;

  const pendingBulkSenders = new Set<string>();
  pendingDeletions.forEach(pending => {
    if (pending.type === 'bulk' && pending.senderEmails && pending.senderNames) {
      pending.senderEmails.forEach((email, index) => {
        pendingBulkSenders.add(`${email}|||${pending.senderNames![index]}`);
      });
    }
  });

  if (pendingBulkSenders.size === 0) return senderList;

  return senderList.filter(sender => {
    const key = `${sender.email}|||${sender.name}`;
    return !pendingBulkSenders.has(key);
  });
}
