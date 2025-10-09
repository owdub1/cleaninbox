import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCardIcon, CalendarIcon, ClockIcon, SettingsIcon, LogOutIcon, MailIcon, AlertCircleIcon, CheckCircleIcon, UserIcon, DollarSignIcon, TrendingUpIcon, XIcon, FileTextIcon, DownloadIcon, EyeIcon, InboxIcon, RefreshCwIcon, TrashIcon, PlusIcon, ArchiveIcon, FolderIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useEmailAccounts } from '../hooks/useEmailAccounts';
const Dashboard = () => {
  const { stats: dbStats, emailAccounts: dbEmailAccounts, loading: statsLoading } = useDashboardData();
  const { addEmailAccount, removeEmailAccount, syncEmailAccount } = useEmailAccounts();
  const [activeTab, setActiveTab] = useState('overview');

  const [activeSubTab, setActiveSubTab] = useState('unsubscribe'); // New state for sub-tabs
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSender, setSelectedSender] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEmailLimitModal, setShowEmailLimitModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [emailToDisconnect, setEmailToDisconnect] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  // Add missing subscriptions state
  const [subscriptions, setSubscriptions] = useState([{
    id: 1,
    name: 'Daily Newsletter',
    email: 'newsletter@dailynews.com',
    frequency: 'Daily',
    lastReceived: '2 hours ago',
    selected: false
  }, {
    id: 2,
    name: 'Shopping Promotions',
    email: 'deals@shopmart.com',
    frequency: 'Weekly',
    lastReceived: '1 day ago',
    selected: false
  }, {
    id: 3,
    name: 'Social Media Updates',
    email: 'notifications@socialapp.com',
    frequency: 'Daily',
    lastReceived: '3 hours ago',
    selected: false
  }, {
    id: 4,
    name: 'Tech Blog',
    email: 'updates@techblog.com',
    frequency: 'Bi-weekly',
    lastReceived: '5 days ago',
    selected: false
  }]);
  const [connectedEmails, setConnectedEmails] = useState([]);

  // Update connectedEmails when dbEmailAccounts changes
  useEffect(() => {
    setConnectedEmails(dbEmailAccounts);
  }, [dbEmailAccounts]);

  // State for Clean My Inbox tab
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [emailGroups, setEmailGroups] = useState([{
    id: 1,
    yearRange: '2025',
    senders: [{
      name: 'Amazon',
      count: 37,
      selected: false
    }, {
      name: 'LinkedIn',
      count: 29,
      selected: false
    }, {
      name: 'Twitter',
      count: 18,
      selected: false
    }, {
      name: 'Netflix',
      count: 12,
      selected: false
    }],
    expanded: true,
    selected: false
  }, {
    id: 2,
    yearRange: '2024',
    senders: [{
      name: 'Amazon',
      count: 42,
      selected: false
    }, {
      name: 'LinkedIn',
      count: 38,
      selected: false
    }, {
      name: 'Twitter',
      count: 25,
      selected: false
    }, {
      name: 'Netflix',
      count: 18,
      selected: false
    }],
    expanded: false,
    selected: false
  }, {
    id: 3,
    yearRange: '2022',
    senders: [{
      name: 'Amazon',
      count: 76,
      selected: false
    }, {
      name: 'Facebook',
      count: 53,
      selected: false
    }, {
      name: 'LinkedIn',
      count: 47,
      selected: false
    }, {
      name: 'Google',
      count: 35,
      selected: false
    }, {
      name: 'Apple',
      count: 22,
      selected: false
    }],
    expanded: false,
    selected: false
  }, {
    id: 4,
    yearRange: '2021',
    senders: [{
      name: 'Amazon',
      count: 64,
      selected: false
    }, {
      name: 'Zoom',
      count: 58,
      selected: false
    }, {
      name: 'Microsoft Teams',
      count: 45,
      selected: false
    }, {
      name: 'Facebook',
      count: 40,
      selected: false
    }, {
      name: 'Google',
      count: 32,
      selected: false
    }],
    expanded: false,
    selected: false
  }, {
    id: 5,
    yearRange: '2019',
    senders: [{
      name: 'Amazon',
      count: 52,
      selected: false
    }, {
      name: 'Facebook',
      count: 47,
      selected: false
    }, {
      name: 'Twitter',
      count: 35,
      selected: false
    }, {
      name: 'LinkedIn',
      count: 29,
      selected: false
    }],
    expanded: false,
    selected: false
  }, {
    id: 6,
    yearRange: '2017',
    senders: [{
      name: 'Old Work Emails',
      count: 124,
      selected: false
    }, {
      name: 'School Emails',
      count: 87,
      selected: false
    }, {
      name: 'Amazon',
      count: 63,
      selected: false
    }, {
      name: 'Facebook',
      count: 41,
      selected: false
    }],
    expanded: false,
    selected: false
  }]);
  // Mock data for emails by subscription
  const [subscriptionEmails, setSubscriptionEmails] = useState({
    1: [{
      id: 101,
      subject: 'Your Daily Newsletter',
      date: '2023-11-20',
      preview: "Check out today's top stories and updates..."
    }, {
      id: 102,
      subject: 'Breaking News',
      date: '2023-11-19',
      preview: 'Latest updates on current events around the world...'
    }, {
      id: 103,
      subject: 'Weekly Roundup',
      date: '2023-11-18',
      preview: "A summary of this week's most important stories..."
    }, {
      id: 104,
      subject: 'Special Offer Inside',
      date: '2023-11-15',
      preview: 'Exclusive deals for our newsletter subscribers...'
    }],
    2: [{
      id: 201,
      subject: 'New Arrivals - 30% Off',
      date: '2023-11-21',
      preview: 'Check out our latest products with special discount...'
    }, {
      id: 202,
      subject: 'Flash Sale: 24 Hours Only',
      date: '2023-11-18',
      preview: "Don't miss out on these limited-time offers..."
    }, {
      id: 203,
      subject: 'Your Shopping Cart',
      date: '2023-11-15',
      preview: 'You left items in your cart. Complete your purchase...'
    }, {
      id: 204,
      subject: 'Holiday Season Deals',
      date: '2023-11-10',
      preview: 'Prepare for the holidays with these amazing offers...'
    }],
    3: [{
      id: 301,
      subject: 'New Connection Request',
      date: '2023-11-22',
      preview: 'Someone wants to connect with you on Social Media...'
    }, {
      id: 302,
      subject: 'Your Post is Trending',
      date: '2023-11-20',
      preview: 'Your recent post is getting a lot of attention...'
    }, {
      id: 303,
      subject: 'Friend Activity Update',
      date: '2023-11-17',
      preview: 'See what your friends have been up to recently...'
    }, {
      id: 304,
      subject: 'New Features Announcement',
      date: '2023-11-12',
      preview: "We've added some exciting new features to our platform..."
    }],
    4: [{
      id: 401,
      subject: 'Latest Tech News',
      date: '2023-11-21',
      preview: 'Breaking developments in the tech industry...'
    }, {
      id: 402,
      subject: 'Product Review: New Gadgets',
      date: '2023-11-19',
      preview: 'Our experts review the latest tech products...'
    }, {
      id: 403,
      subject: 'Industry Insights',
      date: '2023-11-16',
      preview: 'Analysis of current trends in technology...'
    }, {
      id: 404,
      subject: 'Tech Conference Invitation',
      date: '2023-11-14',
      preview: 'Join us at the upcoming tech conference...'
    }]
  });
  // Mock data for emails by year with better sender organization
  const [yearEmails, setYearEmails] = useState({
    '2025': {
      senders: [{
        name: 'Amazon',
        count: 37,
        emails: [{
          id: 501,
          subject: 'Your Order Has Shipped',
          date: '2025-05-20',
          preview: 'Your recent purchase is on its way...',
          selected: false
        }, {
          id: 502,
          subject: 'Order Confirmation',
          date: '2025-05-18',
          preview: 'Thank you for your purchase...',
          selected: false
        }, {
          id: 503,
          subject: 'Recommended for You',
          date: '2025-05-15',
          preview: 'Based on your browsing history...',
          selected: false
        }, {
          id: 504,
          subject: 'Flash Deals',
          date: '2025-05-10',
          preview: 'Limited-time offers just for you...',
          selected: false
        }, {
          id: 510,
          subject: 'Your Amazon Prime Benefits',
          date: '2025-04-25',
          preview: 'Check out these exclusive Prime benefits...',
          selected: false
        }, {
          id: 511,
          subject: 'New Release in Your Wishlist',
          date: '2025-04-20',
          preview: 'An item on your wishlist is now available...',
          selected: false
        }, {
          id: 512,
          subject: 'Review Your Recent Purchase',
          date: '2025-04-15',
          preview: 'Share your thoughts on your recent order...',
          selected: false
        }, {
          id: 513,
          subject: 'Amazon Deal of the Day',
          date: '2025-04-10',
          preview: 'Special offers just for today...',
          selected: false
        }, {
          id: 514,
          subject: 'Your Account Summary',
          date: '2025-04-05',
          preview: 'Monthly activity on your Amazon account...',
          selected: false
        }, {
          id: 515,
          subject: 'Shipping Update',
          date: '2025-03-28',
          preview: 'Your package will arrive earlier than expected...',
          selected: false
        }, {
          id: 516,
          subject: 'Amazon Gift Card Balance',
          date: '2025-03-20',
          preview: 'You have an unused gift card balance...',
          selected: false
        }, {
          id: 517,
          subject: 'Weekend Deals',
          date: '2025-03-15',
          preview: 'Special offers for this weekend only...',
          selected: false
        }, {
          id: 520,
          subject: 'New Series Recommendation',
          date: '2025-04-28',
          preview: "Based on your viewing history, we think you'll love...",
          selected: false
        }, {
          id: 521,
          subject: 'Popular on Netflix',
          date: '2025-04-25',
          preview: 'See what everyone is watching this week...',
          selected: false
        }, {
          id: 522,
          subject: 'Coming Soon to Netflix',
          date: '2025-04-20',
          preview: 'Exciting new titles arriving next month...',
          selected: false
        }, {
          id: 523,
          subject: 'Account Settings Update',
          date: '2025-04-15',
          preview: "We've updated our privacy settings...",
          selected: false
        }, {
          id: 524,
          subject: 'New Login to Your Account',
          date: '2025-04-10',
          preview: 'We noticed a new login from a device in...',
          selected: false
        }, {
          id: 525,
          subject: 'Your Watchlist Update',
          date: '2025-04-05',
          preview: 'New titles have been added to your watchlist...',
          selected: false
        }, {
          id: 526,
          subject: 'Rate What You Watched',
          date: '2025-03-30',
          preview: 'Help us improve your recommendations...',
          selected: false
        }, {
          id: 527,
          subject: 'Special Offer for Members',
          date: '2025-03-25',
          preview: 'Exclusive discount on merchandise...',
          selected: false
        }, {
          id: 528,
          subject: 'Weekend Binge Suggestions',
          date: '2025-03-20',
          preview: 'Perfect shows to watch this weekend...',
          selected: false
        }, {
          id: 529,
          subject: 'Subscription Renewal',
          date: '2025-03-15',
          preview: 'Your subscription will renew on...',
          selected: false
        }, {
          id: 530,
          subject: 'Top 10 in Your Country',
          date: '2025-03-10',
          preview: "See what's trending in your region...",
          selected: false
        }, {
          id: 531,
          subject: 'Netflix Original Premiere',
          date: '2025-03-05',
          preview: "Don't miss our latest original series...",
          selected: false
        }, {
          id: 532,
          subject: 'Download for Offline Viewing',
          date: '2025-02-28',
          preview: 'New titles available for download...',
          selected: false
        }]
      }, {
        name: 'Netflix',
        count: 28,
        emails: [{
          id: 505,
          subject: 'New Shows Added',
          date: '2023-11-19',
          preview: "Check out what's new this week...",
          selected: false
        }, {
          id: 506,
          subject: 'Continue Watching',
          date: '2023-11-12',
          preview: 'Pick up where you left off...',
          selected: false
        }, {
          id: 507,
          subject: 'Your Monthly Statement',
          date: '2023-11-01',
          preview: 'Your Netflix billing statement is ready...',
          selected: false
        }]
      }, {
        name: 'John Smith',
        count: 15,
        emails: [{
          id: 508,
          subject: 'Meeting Tomorrow',
          date: '2023-11-21',
          preview: "Let's discuss the project details...",
          selected: false
        }, {
          id: 509,
          subject: 'Project Update',
          date: '2023-11-15',
          preview: "Here's the latest on our current project...",
          selected: false
        }, {
          id: 540,
          subject: 'Quarterly Report',
          date: '2023-11-10',
          preview: 'Please review the attached quarterly report...',
          selected: false
        }, {
          id: 541,
          subject: 'Team Lunch Next Week',
          date: '2023-11-05',
          preview: 'Would you be available for team lunch on...',
          selected: false
        }, {
          id: 542,
          subject: 'Client Feedback',
          date: '2023-10-30',
          preview: 'The client has provided feedback on our proposal...',
          selected: false
        }, {
          id: 543,
          subject: 'New Project Opportunity',
          date: '2023-10-25',
          preview: 'I wanted to discuss a potential new project with you...',
          selected: false
        }, {
          id: 544,
          subject: 'Conference Registration',
          date: '2023-10-20',
          preview: 'Have you registered for the industry conference yet?',
          selected: false
        }, {
          id: 545,
          subject: 'Budget Approval',
          date: '2023-10-15',
          preview: 'The budget for Q4 has been approved...',
          selected: false
        }, {
          id: 546,
          subject: 'Vacation Request',
          date: '2023-10-10',
          preview: "I'll be taking vacation from October 20-27...",
          selected: false
        }, {
          id: 547,
          subject: 'Office Supplies Order',
          date: '2023-10-05',
          preview: "I've ordered the supplies you requested...",
          selected: false
        }, {
          id: 548,
          subject: 'Contract Review',
          date: '2023-09-30',
          preview: 'Please review the attached contract before...',
          selected: false
        }, {
          id: 549,
          subject: 'Happy Hour Friday',
          date: '2023-09-25',
          preview: "We're organizing a team happy hour this Friday...",
          selected: false
        }, {
          id: 550,
          subject: 'Training Session',
          date: '2023-09-20',
          preview: 'Reminder about the training session tomorrow...',
          selected: false
        }]
      }]
    },
    '2024': {
      senders: [{
        name: 'Amazon',
        count: 42,
        emails: [{
          id: 501,
          subject: 'Your Order Has Shipped',
          date: '2024-11-20',
          preview: 'Your recent purchase is on its way...',
          selected: false
        }, {
          id: 502,
          subject: 'Order Confirmation',
          date: '2024-11-18',
          preview: 'Thank you for your purchase...',
          selected: false
        }, {
          id: 503,
          subject: 'Recommended for You',
          date: '2024-11-15',
          preview: 'Based on your browsing history...',
          selected: false
        }, {
          id: 504,
          subject: 'Flash Deals',
          date: '2024-11-10',
          preview: 'Limited-time offers just for you...',
          selected: false
        }, {
          id: 510,
          subject: 'Your Amazon Prime Benefits',
          date: '2024-10-25',
          preview: 'Check out these exclusive Prime benefits...',
          selected: false
        }, {
          id: 511,
          subject: 'New Release in Your Wishlist',
          date: '2024-10-20',
          preview: 'An item on your wishlist is now available...',
          selected: false
        }, {
          id: 512,
          subject: 'Review Your Recent Purchase',
          date: '2024-10-15',
          preview: 'Share your thoughts on your recent order...',
          selected: false
        }, {
          id: 513,
          subject: 'Amazon Deal of the Day',
          date: '2024-10-10',
          preview: 'Special offers just for today...',
          selected: false
        }, {
          id: 514,
          subject: 'Your Account Summary',
          date: '2024-10-05',
          preview: 'Monthly activity on your Amazon account...',
          selected: false
        }, {
          id: 515,
          subject: 'Shipping Update',
          date: '2024-09-28',
          preview: 'Your package will arrive earlier than expected...',
          selected: false
        }, {
          id: 516,
          subject: 'Amazon Gift Card Balance',
          date: '2024-09-20',
          preview: 'You have an unused gift card balance...',
          selected: false
        }, {
          id: 517,
          subject: 'Weekend Deals',
          date: '2024-09-15',
          preview: 'Special offers for this weekend only...',
          selected: false
        }, {
          id: 520,
          subject: 'New Series Recommendation',
          date: '2024-10-28',
          preview: "Based on your viewing history, we think you'll love...",
          selected: false
        }, {
          id: 521,
          subject: 'Popular on Netflix',
          date: '2024-10-25',
          preview: 'See what everyone is watching this week...',
          selected: false
        }, {
          id: 522,
          subject: 'Coming Soon to Netflix',
          date: '2024-10-20',
          preview: 'Exciting new titles arriving next month...',
          selected: false
        }, {
          id: 523,
          subject: 'Account Settings Update',
          date: '2024-10-15',
          preview: "We've updated our privacy settings...",
          selected: false
        }, {
          id: 524,
          subject: 'New Login to Your Account',
          date: '2024-10-10',
          preview: 'We noticed a new login from a device in...',
          selected: false
        }, {
          id: 525,
          subject: 'Your Watchlist Update',
          date: '2024-10-05',
          preview: 'New titles have been added to your watchlist...',
          selected: false
        }, {
          id: 526,
          subject: 'Rate What You Watched',
          date: '2024-09-30',
          preview: 'Help us improve your recommendations...',
          selected: false
        }, {
          id: 527,
          subject: 'Special Offer for Members',
          date: '2024-09-25',
          preview: 'Exclusive discount on merchandise...',
          selected: false
        }, {
          id: 528,
          subject: 'Weekend Binge Suggestions',
          date: '2024-09-20',
          preview: 'Perfect shows to watch this weekend...',
          selected: false
        }, {
          id: 529,
          subject: 'Subscription Renewal',
          date: '2024-09-15',
          preview: 'Your subscription will renew on...',
          selected: false
        }, {
          id: 530,
          subject: 'Top 10 in Your Country',
          date: '2024-09-10',
          preview: "See what's trending in your region...",
          selected: false
        }, {
          id: 531,
          subject: 'Netflix Original Premiere',
          date: '2024-09-05',
          preview: "Don't miss our latest original series...",
          selected: false
        }, {
          id: 532,
          subject: 'Download for Offline Viewing',
          date: '2024-09-01',
          preview: 'New titles available for download...',
          selected: false
        }]
      }, {
        name: 'Netflix',
        count: 28,
        emails: [{
          id: 505,
          subject: 'New Shows Added',
          date: '2023-11-19',
          preview: "Check out what's new this week...",
          selected: false
        }, {
          id: 506,
          subject: 'Continue Watching',
          date: '2023-11-12',
          preview: 'Pick up where you left off...',
          selected: false
        }, {
          id: 507,
          subject: 'Your Monthly Statement',
          date: '2023-11-01',
          preview: 'Your Netflix billing statement is ready...',
          selected: false
        }]
      }, {
        name: 'John Smith',
        count: 15,
        emails: [{
          id: 508,
          subject: 'Meeting Tomorrow',
          date: '2023-11-21',
          preview: "Let's discuss the project details...",
          selected: false
        }, {
          id: 509,
          subject: 'Project Update',
          date: '2023-11-15',
          preview: "Here's the latest on our current project...",
          selected: false
        }, {
          id: 540,
          subject: 'Quarterly Report',
          date: '2023-11-10',
          preview: 'Please review the attached quarterly report...',
          selected: false
        }, {
          id: 541,
          subject: 'Team Lunch Next Week',
          date: '2023-11-05',
          preview: 'Would you be available for team lunch on...',
          selected: false
        }, {
          id: 542,
          subject: 'Client Feedback',
          date: '2023-10-30',
          preview: 'The client has provided feedback on our proposal...',
          selected: false
        }, {
          id: 543,
          subject: 'New Project Opportunity',
          date: '2023-10-25',
          preview: 'I wanted to discuss a potential new project with you...',
          selected: false
        }, {
          id: 544,
          subject: 'Conference Registration',
          date: '2023-10-20',
          preview: 'Have you registered for the industry conference yet?',
          selected: false
        }, {
          id: 545,
          subject: 'Budget Approval',
          date: '2023-10-15',
          preview: 'The budget for Q4 has been approved...',
          selected: false
        }, {
          id: 546,
          subject: 'Vacation Request',
          date: '2023-10-10',
          preview: "I'll be taking vacation from October 20-27...",
          selected: false
        }, {
          id: 547,
          subject: 'Office Supplies Order',
          date: '2023-10-05',
          preview: "I've ordered the supplies you requested...",
          selected: false
        }, {
          id: 548,
          subject: 'Contract Review',
          date: '2023-09-30',
          preview: 'Please review the attached contract before...',
          selected: false
        }, {
          id: 549,
          subject: 'Happy Hour Friday',
          date: '2023-09-25',
          preview: "We're organizing a team happy hour this Friday...",
          selected: false
        }, {
          id: 550,
          subject: 'Training Session',
          date: '2023-09-20',
          preview: 'Reminder about the training session tomorrow...',
          selected: false
        }]
      }]
    },
    '2022': {
      senders: [{
        name: 'Amazon',
        count: 76,
        emails: [{
          id: 601,
          subject: 'Your Annual Summary',
          date: '2022-12-30',
          preview: 'See your shopping activity for the year...',
          selected: false
        }, {
          id: 602,
          subject: 'Holiday Gift Guide',
          date: '2022-12-10',
          preview: 'Find the perfect gifts for everyone...',
          selected: false
        }, {
          id: 603,
          subject: 'Black Friday Deals',
          date: '2022-11-25',
          preview: 'Early access to our biggest sale of the year...',
          selected: false
        }, {
          id: 604,
          subject: 'Your Order Has Been Delivered',
          date: '2022-11-20',
          preview: 'Your package has been delivered to your address...',
          selected: false
        }, {
          id: 605,
          subject: 'Amazon Prime Video New Releases',
          date: '2022-11-15',
          preview: "Check out what's new on Prime Video this month...",
          selected: false
        }, {
          id: 606,
          subject: 'Your Shipment is On Its Way',
          date: '2022-11-10',
          preview: 'Track your package with the link below...',
          selected: false
        }, {
          id: 607,
          subject: 'Recommendations Based on Your Browsing',
          date: '2022-11-05',
          preview: 'Products you might be interested in...',
          selected: false
        }, {
          id: 608,
          subject: 'Amazon Music Subscription',
          date: '2022-10-30',
          preview: 'Your monthly subscription has been renewed...',
          selected: false
        }, {
          id: 609,
          subject: 'Limited Time Offer',
          date: '2022-10-25',
          preview: 'Special discounts on selected items...',
          selected: false
        }, {
          id: 610,
          subject: 'Your Amazon Photos Storage',
          date: '2022-10-20',
          preview: 'Your photo storage is almost full...',
          selected: false
        }, {
          id: 611,
          subject: 'Amazon Smile Donation',
          date: '2022-10-15',
          preview: 'Your purchases have generated donations...',
          selected: false
        }, {
          id: 612,
          subject: 'Rate Your Experience',
          date: '2022-10-10',
          preview: 'Tell us about your recent shopping experience...',
          selected: false
        }]
      }, {
        name: 'Facebook',
        count: 53,
        emails: [{
          id: 603,
          subject: 'Your Memories',
          date: '2022-11-15',
          preview: 'See your posts from this day in previous years...',
          selected: false
        }]
      }, {
        name: 'LinkedIn',
        count: 47,
        emails: [{
          id: 604,
          subject: 'Job Recommendations',
          date: '2022-10-20',
          preview: 'Jobs that match your profile...',
          selected: false
        }]
      }]
    },
    '2021': {
      senders: [{
        name: 'Amazon',
        count: 64,
        emails: [{
          id: 702,
          subject: 'Your Account Security',
          date: '2021-11-20',
          preview: 'Important information about your account...',
          selected: false
        }]
      }, {
        name: 'Zoom',
        count: 58,
        emails: [{
          id: 701,
          subject: 'Meeting Invitation',
          date: '2020-12-15',
          preview: "You've been invited to join a meeting...",
          selected: false
        }, {
          id: 702,
          subject: 'Meeting Recording Available',
          date: '2020-12-10',
          preview: 'Your cloud recording is now available...',
          selected: false
        }, {
          id: 703,
          subject: 'Zoom Webinar Reminder',
          date: '2020-12-05',
          preview: 'Your webinar starts in 1 hour...',
          selected: false
        }, {
          id: 704,
          subject: 'Your Zoom Account Summary',
          date: '2020-11-30',
          preview: 'Monthly usage statistics for your account...',
          selected: false
        }, {
          id: 705,
          subject: 'Zoom Security Update',
          date: '2020-11-25',
          preview: 'Important security features have been added...',
          selected: false
        }, {
          id: 706,
          subject: 'Zoom Meeting Canceled',
          date: '2020-11-20',
          preview: 'A scheduled meeting has been canceled...',
          selected: false
        }, {
          id: 707,
          subject: 'Meeting Time Changed',
          date: '2020-11-15',
          preview: 'Your scheduled meeting time has been updated...',
          selected: false
        }, {
          id: 708,
          subject: 'Zoom Pro Trial Ending',
          date: '2020-11-10',
          preview: 'Your Pro trial will end in 3 days...',
          selected: false
        }, {
          id: 709,
          subject: 'Your Account Security',
          date: '2020-11-20',
          preview: 'Important information about your account...',
          selected: false
        }, {
          id: 710,
          subject: 'Your Order from 2020',
          date: '2020-11-15',
          preview: 'Details about your recent purchase...',
          selected: false
        }, {
          id: 711,
          subject: 'Amazon Prime Day Deals',
          date: '2020-10-13',
          preview: 'Exclusive deals for Prime members only...',
          selected: false
        }, {
          id: 712,
          subject: 'Your Delivery Preference',
          date: '2020-10-10',
          preview: 'Update your delivery preferences...',
          selected: false
        }, {
          id: 713,
          subject: 'Amazon Business Account',
          date: '2020-10-05',
          preview: 'Benefits of upgrading to a business account...',
          selected: false
        }, {
          id: 714,
          subject: 'Your Amazon Wishlist',
          date: '2020-09-30',
          preview: 'Items in your wishlist are on sale...',
          selected: false
        }, {
          id: 715,
          subject: 'Amazon Echo Tips',
          date: '2020-09-25',
          preview: 'Get the most out of your Echo device...',
          selected: false
        }, {
          id: 716,
          subject: 'Review Your Recent Purchases',
          date: '2020-09-20',
          preview: 'Share your thoughts on recent orders...',
          selected: false
        }, {
          id: 717,
          subject: 'Amazon Fresh Now Available',
          date: '2020-09-15',
          preview: 'Grocery delivery is now available in your area...',
          selected: false
        }, {
          id: 718,
          subject: 'Your Kindle eBook Delivery',
          date: '2020-09-10',
          preview: 'Your eBook is ready to read...',
          selected: false
        }]
      }, {
        name: 'Microsoft Teams',
        count: 45,
        emails: [{
          id: 703,
          subject: 'Team Update',
          date: '2020-10-10',
          preview: 'Recent activity in your team workspace...',
          selected: false
        }]
      }, {
        name: 'Facebook',
        count: 40,
        emails: [{
          id: 704,
          subject: 'Privacy Policy Update',
          date: '2020-09-05',
          preview: "We've updated our privacy policy...",
          selected: false
        }]
      }]
    },
    '2019': {
      senders: [{
        name: 'Amazon',
        count: 52,
        emails: [{
          id: 801,
          subject: 'Amazon Prime Day',
          date: '2019-07-15',
          preview: 'Exclusive deals for Prime members...',
          selected: false
        }]
      }, {
        name: 'Facebook',
        count: 47,
        emails: [{
          id: 704,
          subject: 'Privacy Policy Update',
          date: '2020-09-05',
          preview: "We've updated our privacy policy...",
          selected: false
        }]
      }]
    },
    '2017': {
      senders: [{
        name: 'Old Work Emails',
        count: 124,
        emails: [{
          id: 901,
          subject: 'Project Update',
          date: '2017-06-10',
          preview: 'Latest updates on the project...',
          selected: false
        }]
      }, {
        name: 'School Emails',
        count: 87,
        emails: [{
          id: 902,
          subject: 'Class Schedule Update',
          date: '2017-05-15',
          preview: 'Your class schedule has been updated...',
          selected: false
        }]
      }, {
        name: 'Amazon',
        count: 63,
        emails: [{
          id: 702,
          subject: 'Your Account Security',
          date: '2020-11-20',
          preview: 'Important information about your account...',
          selected: false
        }]
      }, {
        name: 'Facebook',
        count: 41,
        emails: [{
          id: 704,
          subject: 'Privacy Policy Update',
          date: '2020-09-05',
          preview: "We've updated our privacy policy...",
          selected: false
        }]
      }]
    }
  });
  const navigate = useNavigate();
  const {
    user,
    logout
  } = useAuth();
  // User data from auth and database
  const userData = {
    name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User',
    email: user?.email || '',
    subscription: user?.subscription || {
      plan: 'Free',
      status: 'Active',
      nextBilling: null,
      price: '$0',
      period: 'monthly',
      emailLimit: 1
    },
    stats: {
      emailsProcessed: dbStats.emailsProcessed,
      unsubscribed: dbStats.unsubscribed,
      emailAccounts: dbStats.emailAccounts
    },
    paymentHistory: [{
      id: 'INV-001',
      date: '2025-05-15',
      amount: '$19.99',
      status: 'Paid',
      plan: 'Pro',
      period: 'monthly'
    }, {
      id: 'INV-002',
      date: '2025-04-15',
      amount: '$19.99',
      status: 'Paid',
      plan: 'Pro',
      period: 'monthly'
    }, {
      id: 'INV-003',
      date: '2025-03-15',
      amount: '$19.99',
      status: 'Paid',
      plan: 'Pro',
      period: 'monthly'
    }]
  };
  const handlePlanSwitch = (planId, billing = 'monthly') => {
    navigate(`/checkout?plan=${planId}&billing=${billing}`);
  };
  const viewInvoice = invoice => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };
  const handleConnectNewEmail = async () => {
    // Check if user has reached their email account limit
    if (connectedEmails.length >= userData.subscription.emailLimit) {
      setShowEmailLimitModal(true);
    } else {
      // Prompt user for email address
      const email = prompt('Enter email address to connect:');
      if (!email) return;

      // Optionally prompt for provider
      const provider = prompt('Enter provider (Gmail, Outlook, etc.):', 'Gmail');
      if (!provider) return;

      try {
        await addEmailAccount(email, provider);
        // The useDashboardData hook will automatically refresh and update connectedEmails
        alert('Email account connected successfully!');
      } catch (error: any) {
        alert('Failed to connect email account: ' + error.message);
      }
    }
  };
  const handleSyncEmail = async (email) => {
    try {
      await syncEmailAccount(email.id);
      // The useDashboardData hook will automatically refresh and update connectedEmails
      alert(`Synced ${email.email} successfully!`);
    } catch (error: any) {
      alert('Failed to sync email account: ' + error.message);
    }
  };
  const handleDisconnectEmail = email => {
    setEmailToDisconnect(email);
    setShowDisconnectModal(true);
  };
  const confirmDisconnectEmail = async () => {
    if (emailToDisconnect) {
      try {
        await removeEmailAccount(emailToDisconnect.id);
        // The useDashboardData hook will automatically refresh and update connectedEmails
        setShowDisconnectModal(false);
        setEmailToDisconnect(null);
      } catch (error: any) {
        alert('Failed to disconnect email account: ' + error.message);
      }
    }
  };
  const handleDownloadPdf = invoice => {
    setSelectedInvoice(invoice);
    setShowPdfPreview(true);
  };
  // Toggle selection of subscription
  const toggleSubscription = id => {
    setSubscriptions(subscriptions.map(sub => sub.id === id ? {
      ...sub,
      selected: !sub.selected
    } : sub));
  };
  // Toggle expansion of email group
  const toggleGroupExpansion = id => {
    setEmailGroups(emailGroups.map(group => group.id === id ? {
      ...group,
      expanded: !group.expanded
    } : group));
  };
  // Toggle selection of email group
  const toggleEmailGroup = id => {
    setEmailGroups(emailGroups.map(group => group.id === id ? {
      ...group,
      selected: !group.selected,
      senders: group.senders.map(sender => ({
        ...sender,
        selected: !group.selected
      }))
    } : group));
  };
  // Toggle selection of sender within a group
  const toggleSender = (groupId, senderName) => {
    setEmailGroups(emailGroups.map(group => group.id === groupId ? {
      ...group,
      senders: group.senders.map(sender => sender.name === senderName ? {
        ...sender,
        selected: !sender.selected
      } : sender)
    } : group));
  };
  // Select all subscriptions
  const selectAllSubscriptions = select => {
    setSubscriptions(subscriptions.map(sub => ({
      ...sub,
      selected: select
    })));
  };
  // Select all email groups
  const selectAllEmailGroups = select => {
    setEmailGroups(emailGroups.map(group => ({
      ...group,
      selected: select,
      senders: group.senders.map(sender => ({
        ...sender,
        selected: select
      }))
    })));
  };
  // Count selected items
  const selectedSubscriptionsCount = subscriptions.filter(sub => sub.selected).length;
  // Count selected senders across all groups
  const selectedSendersCount = emailGroups.reduce((total, group) => total + group.senders.filter(sender => sender.selected).length, 0);
  // Count total emails selected for deletion
  const selectedEmailsCount = emailGroups.reduce((total, group) => total + group.senders.reduce((groupTotal, sender) => groupTotal + (sender.selected ? sender.count : 0), 0), 0);
  // Toggle selection of email
  const toggleEmailSelection = (yearRange, senderName, emailId) => {
    setYearEmails(prevYearEmails => {
      const updatedYearEmails = {
        ...prevYearEmails
      };
      const senderIndex = updatedYearEmails[yearRange].senders.findIndex(sender => sender.name === senderName);
      if (senderIndex !== -1) {
        const emailIndex = updatedYearEmails[yearRange].senders[senderIndex].emails.findIndex(email => email.id === emailId);
        if (emailIndex !== -1) {
          updatedYearEmails[yearRange].senders[senderIndex].emails[emailIndex].selected = !updatedYearEmails[yearRange].senders[senderIndex].emails[emailIndex].selected;
        }
      }
      return updatedYearEmails;
    });
  };
  // Select all emails from a sender
  const selectAllSenderEmails = (yearRange, senderName, selected) => {
    setYearEmails(prevYearEmails => {
      const updatedYearEmails = {
        ...prevYearEmails
      };
      const senderIndex = updatedYearEmails[yearRange].senders.findIndex(sender => sender.name === senderName);
      if (senderIndex !== -1) {
        updatedYearEmails[yearRange].senders[senderIndex].emails = updatedYearEmails[yearRange].senders[senderIndex].emails.map(email => ({
          ...email,
          selected
        }));
      }
      return updatedYearEmails;
    });
  };
  // Count selected emails
  const countSelectedEmails = () => {
    let count = 0;
    Object.keys(yearEmails).forEach(yearRange => {
      yearEmails[yearRange].senders.forEach(sender => {
        count += sender.emails.filter(email => email.selected).length;
      });
    });
    return count;
  };
  // When a tab is changed, reset selections
  const handleTabChange = tab => {
    setActiveTab(tab);
    if (tab === 'cleaninbox') {
      // Default to unsubscribe sub-tab when entering Clean My Inbox
      setActiveSubTab('unsubscribe');
      setSelectedSubscriber(null);
      setSelectedYear(null);
      setSelectedSender(null);
    }
  };
  // When a sub-tab is changed, reset selections
  const handleSubTabChange = subTab => {
    setActiveSubTab(subTab);
    setSelectedSubscriber(null);
    setSelectedYear(null);
    setSelectedSender(null);
  };
  return <div className="w-full bg-white">
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
              <p className="mt-2 text-blue-100">
                Welcome back, {userData.name}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button className="bg-white text-purple-600 px-4 py-2 rounded-md font-medium hover:bg-purple-50 transition-colors">
                Clean My Inbox
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Dashboard Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => handleTabChange('overview')}>
              Overview
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'cleaninbox' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => handleTabChange('cleaninbox')}>
              Clean My Inbox
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'myemails' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('myemails')}>
              Email Accounts
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'subscription' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('subscription')}>
              Subscription
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'payments' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('payments')}>
              Payment History
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'settings' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('settings')}>
              Settings
            </button>
          </div>
          {/* Tab Content */}
          <div className="mt-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                        <MailIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Emails Processed
                        </h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {userData.stats.emailsProcessed}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100 text-green-600">
                        <CheckCircleIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Unsubscribed
                        </h3>
                        <p className="text-2xl font-bold text-green-600">
                          {userData.stats.unsubscribed}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Email Accounts
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {connectedEmails.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Subscription Overview
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Current Plan</p>
                        <p className="text-lg font-medium text-purple-600">
                          {userData.subscription.plan}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full inline-flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {userData.subscription.status}
                        </p>
                      </div>
                      {userData.subscription.nextBilling && <div>
                        <p className="text-sm text-gray-500">Next Billing</p>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-gray-900">
                            {userData.subscription.nextBilling}
                          </p>
                        </div>
                      </div>}
                      <div>
                        <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors" onClick={() => setShowCancelModal(true)}>
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Recent Activity
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900">
                              Processed 57 emails
                            </p>
                            <p className="text-xs text-gray-500">
                              Yesterday at 2:30 PM
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900">
                              Unsubscribed from 12 newsletters
                            </p>
                            <p className="text-xs text-gray-500">
                              Yesterday at 2:35 PM
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900">
                              Connected new email account
                            </p>
                            <p className="text-xs text-gray-500">3 days ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Clean My Inbox Tab */}
            {activeTab === 'cleaninbox' && <div>
                {/* Sub-tabs for Clean My Inbox */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button className={`px-4 py-2 font-medium text-sm ${activeSubTab === 'unsubscribe' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => handleSubTabChange('unsubscribe')}>
                    Unsubscribe
                  </button>
                  <button className={`px-4 py-2 font-medium text-sm ${activeSubTab === 'deleteemail' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => handleSubTabChange('deleteemail')}>
                    Mass Delete
                  </button>
                </div>
                {/* Email Client Interface */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Unsubscribe Sub-tab */}
                  {activeSubTab === 'unsubscribe' && <div className="flex h-[70vh]">
                      {/* Left Sidebar - Subscribers */}
                      <div className="w-1/4 border-r border-gray-200 overflow-y-auto">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-700">
                            Subscriptions
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {subscriptions.map(subscription => <div key={subscription.id} className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedSubscriber === subscription.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`} onClick={() => setSelectedSubscriber(subscription.id)}>
                              <div className="flex items-start">
                                <input type="checkbox" checked={subscription.selected} onChange={e => {
                          e.stopPropagation();
                          toggleSubscription(subscription.id);
                        }} className="h-4 w-4 text-purple-600 border-gray-300 rounded mt-1" />
                                <div className="ml-3">
                                  <h4 className="font-medium text-gray-900 text-sm">
                                    {subscription.name}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {subscription.email}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {subscription.frequency} •{' '}
                                    {subscription.lastReceived}
                                  </p>
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </div>
                      {/* Right Content - Emails */}
                      <div className="w-3/4 overflow-y-auto">
                        {selectedSubscriber ? <div>
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {subscriptions.find(s => s.id === selectedSubscriber)?.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {subscriptions.find(s => s.id === selectedSubscriber)?.email}
                                </p>
                              </div>
                              <button className="bg-gradient-to-r from-blue-500 to-purple-700 text-white px-3 py-1 rounded text-sm font-medium hover:from-blue-600 hover:to-purple-800">
                                Unsubscribe
                              </button>
                            </div>
                            <div className="divide-y divide-gray-200">
                              {subscriptionEmails[selectedSubscriber]?.map(email => <div key={email.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-start">
                                        <h4 className="font-medium text-gray-900">
                                          {email.subject}
                                        </h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                          {email.preview}
                                        </p>
                                      </div>
                                      <span className="text-xs text-gray-400">
                                        {email.date}
                                      </span>
                                    </div>
                                  </div>)}
                            </div>
                          </div> : <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <MailIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p>Select a subscription to view emails</p>
                            </div>
                          </div>}
                      </div>
                    </div>}
                  {/* Delete Emails Sub-tab - Updated to show emails by sender */}
                  {activeSubTab === 'deleteemail' && <div className="flex h-[70vh]">
                      {/* Left Sidebar - Years */}
                      <div className={`${selectedSender ? 'w-1/5' : 'w-1/4'} border-r border-gray-200 overflow-y-auto`}>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-700">
                            Years
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {Object.keys(yearEmails).map(yearRange => <div key={yearRange} className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedYear === yearRange ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`} onClick={() => {
                      setSelectedYear(yearRange);
                      setSelectedSender(null);
                    }}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">
                                    {yearRange}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {yearEmails[yearRange].senders.reduce((total, sender) => total + sender.count, 0)}{' '}
                                    emails
                                  </p>
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </div>
                      {/* Middle Content - Senders for selected year */}
                      {selectedYear && !selectedSender && <div className="w-3/4 overflow-y-auto">
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-medium text-gray-900">
                              Emails from {selectedYear}
                            </h3>
                            <button className="text-amber-600 hover:text-amber-800 text-sm font-medium" onClick={() => setSelectedSender('All')}>
                              View All Emails
                            </button>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {yearEmails[selectedYear].senders.map(sender => <div key={sender.name} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedSender(sender.name)}>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                                      {sender.name.charAt(0)}
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="font-medium text-gray-900">
                                        {sender.name}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        {sender.count} emails
                                      </p>
                                    </div>
                                  </div>
                                  <button className="text-amber-600 hover:text-amber-800 text-sm font-medium" onClick={e => {
                          e.stopPropagation();
                          setSelectedSender(sender.name);
                        }}>
                                    View Emails
                                  </button>
                                </div>
                              </div>)}
                          </div>
                        </div>}
                      {/* Right Content - Emails from selected sender or all emails */}
                      {selectedYear && selectedSender && <div className="w-4/5 overflow-y-auto">
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div>
                              <button className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center" onClick={() => setSelectedSender(null)}>
                                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                                Back to Senders
                              </button>
                              <h3 className="font-medium text-gray-900 mt-1">
                                {selectedSender === 'All' ? `All Emails (${yearEmails[selectedYear].senders.reduce((total, sender) => total + sender.emails.length, 0)} emails)` : `${selectedSender} (${yearEmails[selectedYear].senders.find(s => s.name === selectedSender)?.emails.length} emails)`}
                              </h3>
                            </div>
                            <div className="flex space-x-2">
                              <button className="text-purple-600 hover:text-purple-800 text-sm font-medium" onClick={() => {
                        if (selectedSender === 'All') {
                          // Select all emails from all senders
                          const updatedYearEmails = {
                            ...yearEmails
                          };
                          updatedYearEmails[selectedYear].senders = updatedYearEmails[selectedYear].senders.map(sender => ({
                            ...sender,
                            emails: sender.emails.map(email => ({
                              ...email,
                              selected: true
                            }))
                          }));
                          setYearEmails(updatedYearEmails);
                        } else {
                          selectAllSenderEmails(selectedYear, selectedSender, true);
                        }
                      }}>
                                Select All
                              </button>
                              <button className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700" onClick={() => {
                        let selectedCount = 0;
                        if (selectedSender === 'All') {
                          // Count all selected emails across all senders
                          selectedCount = yearEmails[selectedYear].senders.reduce((count, sender) => count + sender.emails.filter(e => e.selected).length, 0);
                        } else {
                          // Count selected emails for a specific sender
                          selectedCount = yearEmails[selectedYear].senders.find(s => s.name === selectedSender)?.emails.filter(e => e.selected).length || 0;
                        }
                        if (selectedCount > 0) {
                          alert(`${selectedCount} emails would be deleted`);
                        } else {
                          alert('No emails selected');
                        }
                      }}>
                                Delete Selected
                              </button>
                            </div>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {selectedSender === 'All' ?
                    // Show all emails from all senders
                    yearEmails[selectedYear].senders.flatMap(sender => sender.emails.map(email => <div key={`${sender.name}-${email.id}`} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-start">
                                            <input type="checkbox" checked={email.selected} onChange={() => toggleEmailSelection(selectedYear, sender.name, email.id)} className="h-4 w-4 text-red-600 border-gray-300 rounded mt-1 mr-3" />
                                            <div>
                                              <div className="flex items-center mb-1">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-medium mr-2">
                                                  {sender.name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-600">
                                                  {sender.name}
                                                </span>
                                              </div>
                                              <h4 className="font-medium text-gray-900">
                                                {email.subject}
                                              </h4>
                                              <p className="text-sm text-gray-500 mt-1">
                                                {email.preview}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="text-xs text-gray-400">
                                            {email.date}
                                          </span>
                                        </div>
                                      </div>)) :
                    // Show emails from a specific sender
                    yearEmails[selectedYear].senders.find(s => s.name === selectedSender)?.emails.map(email => <div key={email.id} className="p-4 hover:bg-gray-50">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-start">
                                          <input type="checkbox" checked={email.selected} onChange={() => toggleEmailSelection(selectedYear, selectedSender, email.id)} className="h-4 w-4 text-red-600 border-gray-300 rounded mt-1 mr-3" />
                                          <div>
                                            <h4 className="font-medium text-gray-900">
                                              {email.subject}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                              {email.preview}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                          {email.date}
                                        </span>
                                      </div>
                                    </div>)}
                          </div>
                        </div>}
                      {/* Empty state when no year is selected */}
                      {!selectedYear && <div className="w-3/4 flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p>Select a year range to view emails by sender</p>
                          </div>
                        </div>}
                    </div>}
                </div>
              </div>}
            {/* Email Accounts Tab (formerly My Emails) */}
            {activeTab === 'myemails' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Connected Email Accounts
                    </h3>
                    <button className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-blue-700 hover:to-purple-800 transition-colors flex items-center" onClick={handleConnectNewEmail}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect New Email
                    </button>
                  </div>
                  <div className="p-6">
                    {connectedEmails.length > 0 ? <div className="space-y-6">
                        {connectedEmails.map((emailAccount, index) => <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                              <div className="mb-4 md:mb-0">
                                <div className="flex items-center">
                                  <InboxIcon className="h-5 w-5 text-purple-600 mr-2" />
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {emailAccount.email}
                                  </h4>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  Provider: {emailAccount.provider} | Last
                                  synced: {emailAccount.lastSynced}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-100 transition-colors flex items-center" onClick={() => handleSyncEmail(emailAccount)}>
                                  <RefreshCwIcon className="h-3 w-3 mr-1" />
                                  Sync Now
                                </button>
                                <button className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-red-100 transition-colors flex items-center" onClick={() => handleDisconnectEmail(emailAccount)}>
                                  <TrashIcon className="h-3 w-3 mr-1" />
                                  Disconnect
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-500">
                                  Total Emails
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                  {emailAccount.totalEmails.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-500">
                                  Processed
                                </p>
                                <p className="text-xl font-bold text-purple-600">
                                  {emailAccount.processedEmails.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-500">
                                  Unsubscribed
                                </p>
                                <p className="text-xl font-bold text-green-600">
                                  {emailAccount.unsubscribed.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <button className="text-purple-600 text-sm font-medium hover:text-purple-800 flex items-center">
                                <EyeIcon className="h-4 w-4 mr-1" />
                                View Detailed Stats
                              </button>
                            </div>
                          </div>)}
                      </div> : <div className="text-center py-12">
                        <MailIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Email Accounts Connected
                        </h3>
                        <p className="text-gray-500 mb-6">
                          Connect your email accounts to start cleaning your
                          inbox
                        </p>
                        <button className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2 rounded-md font-medium hover:from-blue-700 hover:to-purple-800 transition-colors" onClick={handleConnectNewEmail}>
                          Connect Email Account
                        </button>
                      </div>}
                  </div>
                </div>
                {dbEmailAccounts.length > 0 && <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Email Cleanup Status
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Overall Progress
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            0%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-purple-600 h-2.5 rounded-full" style={{
                        width: '0%'
                      }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Newsletters Processed
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            0%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{
                        width: '0%'
                      }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Marketing Emails
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            0%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-purple-600 h-2.5 rounded-full" style={{
                        width: '0%'
                      }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>}
              </div>}
            {/* Subscription Tab */}
            {activeTab === 'subscription' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Current Subscription
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Current Plan</p>
                        <p className="text-lg font-medium text-purple-600">
                          {userData.subscription.plan}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full inline-flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {userData.subscription.status}
                        </p>
                      </div>
                      {userData.subscription.nextBilling && <div>
                        <p className="text-sm text-gray-500">Next Billing</p>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-gray-900">
                            {userData.subscription.nextBilling}
                          </p>
                        </div>
                      </div>}
                      <div>
                        <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors" onClick={() => setShowCancelModal(true)}>
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Plan Features
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-700">
                            Process up to 2,000 emails/month
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-700">
                            Connect up to {userData.subscription.emailLimit}{' '}
                            email accounts
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-700">
                            Standard unsubscribe speed
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-700">
                            Email support
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-700">
                            Advanced analytics
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-8">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Available Plans
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 cursor-pointer transition-colors" onClick={() => handlePlanSwitch('basic')}>
                          <h5 className="font-medium text-gray-900">Basic</h5>
                          <p className="text-gray-500 text-sm">$9.99/month</p>
                        </div>
                        <div className="border-2 border-purple-400 rounded-lg p-4 relative">
                          <div className="absolute top-0 right-0 bg-purple-400 text-white text-xs px-2 py-1 rounded-bl-lg">
                            Current
                          </div>
                          <h5 className="font-medium text-gray-900">Pro</h5>
                          <p className="text-gray-500 text-sm">$19.99/month</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 cursor-pointer transition-colors relative overflow-hidden" onClick={() => handlePlanSwitch('unlimited')}>
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg transform rotate-0 shadow-md">
                            Upgrade
                          </div>
                          <h5 className="font-medium text-gray-900">
                            Unlimited
                          </h5>
                          <p className="text-gray-500 text-sm">$39.99/month</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Payment History Tab */}
            {activeTab === 'payments' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Payment History
                    </h3>
                  </div>
                  <div className="p-6">
                    {userData.paymentHistory && userData.paymentHistory.length > 0 ? <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userData.paymentHistory.map(invoice => <tr key={invoice.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {invoice.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {invoice.date}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {invoice.amount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button className="text-purple-600 hover:text-purple-900 mr-4" onClick={() => viewInvoice(invoice)}>
                                    View
                                  </button>
                                  <button className="text-purple-600 hover:text-purple-900" onClick={() => handleDownloadPdf(invoice)}>
                                    Download
                                  </button>
                                </td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div> : <div className="text-center py-12">
                        <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Payment History
                        </h3>
                        <p className="text-gray-500">
                          Your payment history will appear here
                        </p>
                      </div>}
                  </div>
                </div>
              </div>}
            {/* Settings Tab */}
            {activeTab === 'settings' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Account Settings
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          Personal Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                              Full Name
                            </label>
                            <input type="text" id="name" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" defaultValue={userData.name} />
                          </div>
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                              Email
                            </label>
                            <input type="email" id="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" defaultValue={userData.email} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          Change Password
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                              Current Password
                            </label>
                            <input type="password" id="currentPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                          </div>
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                              New Password
                            </label>
                            <input type="password" id="newPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                          </div>
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                            </label>
                            <input type="password" id="confirmPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-5 border-t border-gray-200">
                        <div className="flex justify-end">
                          <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                            Cancel
                          </button>
                          <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Danger Zone
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-red-50 border border-red-100 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Delete Account
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              Once you delete your account, there is no going
                              back. Please be certain.
                            </p>
                          </div>
                          <div className="mt-4">
                            <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onClick={logout}>
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
          </div>
        </div>
      </section>
      {/* Cancel Subscription Modal */}
      {showCancelModal && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowCancelModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowCancelModal(false)}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Cancel Your Subscription?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to cancel your subscription? You'll lose
                  access to all Pro features at the end of your current billing
                  period.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm" onClick={() => setShowCancelModal(false)}>
                  Yes, Cancel Subscription
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => setShowCancelModal(false)}>
                  No, Keep My Subscription
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowInvoiceModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-3xl w-full mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Invoice #{selectedInvoice.id}
                </h2>
                <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowInvoiceModal(false)}>
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-gray-100 p-8 rounded-lg border border-gray-300 max-h-[70vh] overflow-y-auto">
                {/* PDF Preview Content */}
                <div className="bg-white p-8 mx-auto max-w-3xl shadow-lg">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        C
                      </div>
                      <div className="ml-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                          CleanInbox
                        </h1>
                        <p className="text-gray-600">
                          Invoice #{selectedInvoice.id}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-right font-bold">INVOICE</p>
                      <p className="text-gray-600">
                        Date: {selectedInvoice.date}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">From</h3>
                      <p className="text-gray-800">CleanInbox, Inc.</p>
                      <p className="text-gray-600">123 Email Street</p>
                      <p className="text-gray-600">San Francisco, CA 94103</p>
                      <p className="text-gray-600">support@cleaninbox.com</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        Bill To
                      </h3>
                      <p className="text-gray-800">{userData.name}</p>
                      <p className="text-gray-600">{userData.email}</p>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Invoice Details
                    </h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            CleanInbox {selectedInvoice.plan} Plan (
                            {selectedInvoice.period})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {selectedInvoice.amount}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Tax
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            $0.00
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <th scope="row" className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                            Total
                          </th>
                          <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                            {selectedInvoice.amount}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">
                          Payment processed via Stripe
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Thank you for your business!
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          CleanInbox
                        </p>
                        <p className="text-sm text-gray-500">
                          support@cleaninbox.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button className="bg-gradient-to-r from-yellow-500 to-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-yellow-600 hover:to-red-700 transition-colors flex items-center" onClick={() => {
              alert(`Invoice ${selectedInvoice.id} downloaded successfully!`);
              setShowInvoiceModal(false);
            }}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* Email Limit Modal */}
      {showEmailLimitModal && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowEmailLimitModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowEmailLimitModal(false)}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Email Account Limit Reached
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Your current plan allows for a maximum of{' '}
                  {userData.subscription.emailLimit} email accounts. Upgrade
                  your plan to connect more email accounts.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-base font-medium text-white hover:from-yellow-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => {
              setShowEmailLimitModal(false);
              handlePlanSwitch('unlimited');
            }}>
                  Upgrade My Plan
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => setShowEmailLimitModal(false)}>
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* Disconnect Email Modal */}
      {showDisconnectModal && emailToDisconnect && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDisconnectModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowDisconnectModal(false)}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Disconnect Email Account
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to disconnect{' '}
                  <span className="font-medium">{emailToDisconnect.email}</span>
                  ? This will remove all data associated with this email
                  account.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm" onClick={confirmDisconnectEmail}>
                  Yes, Disconnect
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => setShowDisconnectModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* PDF Preview Modal */}
      {showPdfPreview && selectedInvoice && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowPdfPreview(false)}></div>
          <div className="relative bg-white rounded-lg max-w-4xl w-full mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Invoice PDF Preview
                </h2>
                <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowPdfPreview(false)}>
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-gray-100 p-8 rounded-lg border border-gray-300 max-h-[70vh] overflow-y-auto">
                {/* PDF Preview Content */}
                <div className="bg-white p-8 mx-auto max-w-3xl shadow-lg">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        C
                      </div>
                      <div className="ml-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                          CleanInbox
                        </h1>
                        <p className="text-gray-600">
                          Invoice #{selectedInvoice.id}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-right font-bold">INVOICE</p>
                      <p className="text-gray-600">
                        Date: {selectedInvoice.date}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">From</h3>
                      <p className="text-gray-800">CleanInbox, Inc.</p>
                      <p className="text-gray-600">123 Email Street</p>
                      <p className="text-gray-600">San Francisco, CA 94103</p>
                      <p className="text-gray-600">support@cleaninbox.com</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        Bill To
                      </h3>
                      <p className="text-gray-800">{userData.name}</p>
                      <p className="text-gray-600">{userData.email}</p>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Invoice Details
                    </h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            CleanInbox {selectedInvoice.plan} Plan (
                            {selectedInvoice.period})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {selectedInvoice.amount}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Tax
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            $0.00
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <th scope="row" className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                            Total
                          </th>
                          <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                            {selectedInvoice.amount}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">
                          Payment processed via Stripe
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Thank you for your business!
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          CleanInbox
                        </p>
                        <p className="text-sm text-gray-500">
                          support@cleaninbox.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button className="bg-gradient-to-r from-yellow-500 to-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-yellow-600 hover:to-red-700 transition-colors flex items-center" onClick={() => {
              alert(`Invoice ${selectedInvoice.id} downloaded successfully!`);
              setShowPdfPreview(false);
            }}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export default Dashboard;