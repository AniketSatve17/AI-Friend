/*
* This file initializes all the different parts
* of your application (Express, Sockets, etc.)
*/

import expressLoader from './express.js';
import socketLoader from './socket.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

export default async (app) => {
  // Create the HTTP server and Socket.IO server
  // This is a crucial step to separate them from the Express app
  const server = createServer(app);
  const io = new Server(server, {
    // We can add options here, like CORS for a React frontend
    // cors: {
    //   origin: "http://localhost:3001",
    //   methods: ["GET", "POST"]
    // }
  });

  // Load the Express middleware
  await expressLoader(app);
  console.log('✅ Express Loader Initialized');

  // Load the Socket.IO logic
  await socketLoader(io);
  console.log('✅ Socket.IO Loader Initialized');

  // We return the server instance, not the app
  // This is so 'index.js' can call server.listen()
  // Wait, no, 'app.listen' in index.js should be 'server.listen'.
  // Let's fix that. I'll modify index.js in my head.

  // Ah, the 'app' in `app.listen` in `index.js` is actually
  // the server instance. Let's fix this properly.
  // I will modify index.js and this file.

  // --- THIS IS THE CORRECTED LOADER ---
  // Return the HTTP server instance for index.js to use
  return { server, io };
};