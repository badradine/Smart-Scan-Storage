import express from 'express';

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /login
Disallow: /register
Disallow: /upload
Disallow: /documents
Disallow: /document/*
Disallow: /search
Disallow: /api/*

Sitemap: ${process.env.BASE_URL || 'http://localhost:5173'}/sitemap.xml
Crawl-delay: 10`;
  
  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

router.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
});

export default router;