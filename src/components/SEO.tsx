import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const CANONICAL_BASE = 'https://cleaninbox.ca';

export function SEO({ title, description, jsonLd }: SEOProps) {
  const siteName = 'CleanInbox';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} — Take Control of Your Inbox`;
  const { pathname } = useLocation();
  const canonicalUrl = `${CANONICAL_BASE}${pathname === '/' ? '' : pathname}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonicalUrl} />
      {description && <meta name="description" content={description} />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
