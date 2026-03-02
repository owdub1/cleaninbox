import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
}

export function SEO({ title, description }: SEOProps) {
  const siteName = 'CleanInbox';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} — Take Control of Your Inbox`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}
