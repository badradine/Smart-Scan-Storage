import express from 'express';
import externalService from '../services/external.service.js';

const router = express.Router();

const requestCounts = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (record.count >= maxRequests) {
    return res.status(429).json({ 
      success: false,
      error: 'Trop de requêtes, veuillez réessayer dans une minute.' 
    });
  }
  
  record.count++;
  requestCounts.set(ip, record);
  next();
};

router.get('/news', rateLimiter, async (req, res) => {
  try {
    const { keyword } = req.query;
    const news = await externalService.getNewsByKeyword(keyword || 'document');
    
    res.json({
      success: true,
      data: news,
      source: news.length > 0 && news[0].source.name !== 'Tech News' ? 'NewsAPI' : 'Mode dégradé',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur route /news:', error);
    res.status(503).json({
      success: false,
      error: 'Service temporairement indisponible',
      data: await externalService.getMockNews(),
    });
  }
});

router.get('/tech-news', rateLimiter, async (req, res) => {
  try {
    const news = await externalService.getTechNews();
    res.json({
      success: true,
      data: news,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur route /tech-news:', error);
    res.status(503).json({
      success: false,
      error: 'Service temporairement indisponible',
      data: [],
    });
  }
});

export default router;