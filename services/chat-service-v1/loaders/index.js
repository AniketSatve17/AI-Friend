import expressLoader from './express.js';
import socketLoader from './socket.js';
import http from 'http';

export default (app) => {
  // --- THIS IS THE FIX ---
  // 1. We must load all the Express routes and middleware FIRST.
  // This configures the 'app' object.
  expressLoader(app);
  console.log('✅ Express Loader Initialized');

  // 2. NOW we create the HTTP server from the *fully configured* app.
  const server = http.createServer(app); 
  // --- END OF FIX ---

  // 3. Load Sockets and attach it to the HTTP server
  socketLoader(server);
  console.log('✅ Socket.IO Loader Initialized');
  
  // 4. Return the server so index.js can call .listen() on it
  return { server }; 
};