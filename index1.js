require('dotenv').config();
const express = require('express');
const loaders = require('.');

async function startServer() {
  const app = express();

  // Load DB, Express, and Socket.io
  // We destructure 'server' because our loader returns { server, io }
  const { server } = await loaders({ expressApp: app });

  // Hugging Face Spaces requires Port 7860
  const PORT = process.env.PORT || 7860;

  server.listen(PORT, () => {
    console.log(`
      ################################################
      🛡️  Sparky Server Listening on Port: ${PORT} 🛡️
      ################################################
    `);
  });
}

startServer();