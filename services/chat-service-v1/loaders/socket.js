/*
* All your Socket.IO logic from the old server.js
* now lives here, nice and clean.
*/

export default (io) => {
  // This is the *exact same logic* from your old server.js
  io.on('connection', (socket) => {
    console.log('A user connected! Socket ID:', socket.id);

    // Send a welcome message to the user who just connected
    socket.emit('chatMessage', {
      user: 'System',
      text: 'Welcome to the chat!'
    });

    // Broadcast to *everyone else* that a new user has joined
    socket.broadcast.emit('chatMessage', {
      user: 'System',
      text: 'A new user has joined the chat.'
    });

    // Listen for 'disconnect' event (user closes the tab)
    socket.on('disconnect', () => {
      console.log('A user disconnected. Socket ID:', socket.id);
      io.emit('chatMessage', {
        user: 'System',
        text: 'A user has left the chat.'
      });
    });

    // Listen for a 'chatMessage' event from a user
    socket.on('chatMessage', (msg) => {
      // We received a message (msg).
      // Now, we broadcast it to *everyone* (including the sender)
      console.log('Message received:', msg);
      io.emit('chatMessage', msg);
    });

    // We will add more logic here later:
    // socket.on('joinRoom', ...);
    // socket.on('aiHelpRequest', ...);
  });
};