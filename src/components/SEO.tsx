import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const CANONICAL_BASE = 'https://cleaninbox.ca';
const DEFAULT_DESCRIPTION = 'CleanInbox is an email cleaner that bulk deletes unwanted emails and unsubscribes you from senders in one click. Works with Gmail and Outlook.';

export function SEO({ title, description, jsonLd }: SEOProps) {
  const siteName = 'CleanInbox';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} — Email Cleaner for Gmail & Outlook`;
  const desc = description || DEFAULT_DESCRIPTION;
  const { pathname } = useLocation();
  const canonicalUrl = `${CANONICAL_BASE}${pathname === '/' ? '' : pathname}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
