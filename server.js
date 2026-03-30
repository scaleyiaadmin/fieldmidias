import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Load API routes
import webhookContent from './api/webhook/content.js';
import contentsIndex from './api/contents/index.js';
import decideContent from './api/contents/[id]/decide.js';
import statsHandler from './api/stats.js';

// Express wrapper for Vercel functions
const serveVercelAPI = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Error in API endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

app.post('/api/webhook/content', serveVercelAPI(webhookContent));
app.get('/api/contents', serveVercelAPI(contentsIndex));
app.post('/api/contents/:id/decide', (req, res) => {
    // Vercel expects id in req.query
    req.query.id = req.params.id;
    return serveVercelAPI(decideContent)(req, res);
});
app.get('/api/stats', serveVercelAPI(statsHandler));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor local rodando em: http://localhost:${PORT}`);
});
