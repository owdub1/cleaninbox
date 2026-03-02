import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEO({ title, description, jsonLd }: SEOProps) {
  const siteName = 'CleanInbox';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} — Take Control of Your Inbox`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
