import express from 'express';
import cors from 'cors';
import healthRoute from '../api/routes/health.js';

// --- ADD THESE LINES ---
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
// __dirname is .../services/chat-service-v1/loaders
const __dirname = path.dirname(__filename);
// Resolve the path to the 'public' folder (one level up)
const publicPath = path.resolve(__dirname, '../public');
// --- END OF NEW LINES ---

export default (app) => {
  // For the health check
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Enable CORS
  app.use(cors());

  // Middleware that transforms the raw string of req.body into json
  app.use(express.json());

  // --- THIS IS THE FIX ---
  // We now use the foolproof 'publicPath' variable
  app.use(express.static(publicPath));
  // --- END OF FIX ---

  // Load API routes
  app.use('/api', healthRoute);

  return app;
};