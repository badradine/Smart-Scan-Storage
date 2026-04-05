import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  noIndex?: boolean;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, any>;
}

const SEO = ({ 
  title, 
  description, 
  noIndex = false, 
  canonicalUrl,
  ogImage = '/logo.png',
  ogType = 'website',
  jsonLd
}: SEOProps) => {
  const fullTitle = `${title} | Smart Scan Storage`;
  const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
  
  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Smart Scan Storage',
    url: baseUrl,
    description: 'Solution de gestion intelligente de documents avec OCR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  
  const finalJsonLd = jsonLd || defaultJsonLd;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {canonicalUrl && <link rel="canonical" href={`${baseUrl}${canonicalUrl}`} />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      {canonicalUrl && <meta property="og:url" content={`${baseUrl}${canonicalUrl}`} />}
      <meta property="og:site_name" content="Smart Scan Storage" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}${ogImage}`} />
      
      <script type="application/ld+json">
        {JSON.stringify(finalJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEO;