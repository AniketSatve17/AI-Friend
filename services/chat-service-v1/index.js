// 1. Load dotenv FIRST
import dotenv from 'dotenv';
dotenv.config();

// 2. NOW import config (which reads process.env)
import config from './config/index.js';

// 3. Import other modules
import loaders from './loaders/index.js';
import express from 'express';

async function startServer() {
  const app = express();

  // Load all modules (Express, Sockets) and get the http server
  const { server } = await loaders(app);

  // Listen on the http server, not the express app
  server.listen(config.port, () => {
    console.log(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);
  }).on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
}

startServer();