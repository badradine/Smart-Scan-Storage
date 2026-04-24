import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, noIndex = false, canonicalUrl }) => {
  const fullTitle = `${title} | Smart Scan Storage`;
  const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
  
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
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${baseUrl}/logo.png`} />
      {canonicalUrl && <meta property="og:url" content={`${baseUrl}${canonicalUrl}`} />}
      <meta property="og:site_name" content="Smart Scan Storage" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}/logo.png`} />
    </Helmet>
  );
};

export default SEO;