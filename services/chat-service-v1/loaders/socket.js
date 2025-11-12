import { Server } from 'socket.io';
import { getAIChatResponse } from '../lib/aiService.js';
import config from '../config/index.js';

let chatHistory = [];
let aiTimer = null;

export default (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for this demo
    },
  });

  io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('system message', 'You are connected! Say hi to start the chat.');

    const triggerAI = async () => {
      console.log('AI timer expired, getting response...');
      
      try {
        const aiResponse = await getAIChatResponse(chatHistory);
        
        if (aiResponse) {
          const aiMessage = {
            user: 'Sparky (AI Friend)',
            text: aiResponse,
            isAI: true,
          };
          chatHistory.push(aiMessage);
          if (chatHistory.length > 10) chatHistory.shift(); 
          io.emit('ai message', aiMessage);
        } else {
          // This case is now handled by an error in aiService, but we keep it as a fallback
          console.warn("AI response was null or empty.");
          io.emit('system message', 'AI Friend is thinking... but had nothing to say.');
        }

      } catch (error) {
        // --- *** THIS IS THE NEW ERROR HANDLING *** ---
        // This 'catch' block will now receive the errors from aiService
        console.error("AI Service Error:", error.message);
        // Send a clean error message to the chat UI
        let userErrorMessage = `AI Friend Error: ${error.message}`;

        // Check for the specific 'fieldViolations' error from your log
        if (error.errorDetails && error.errorDetails[0] && error.errorDetails[0].fieldViolations) {
          userErrorMessage = `AI Friend Error: The API rejected the system prompt. (Code: 400)`;
        } else if (error.message.includes("API key not valid")) {
          userErrorMessage = "AI Friend Error: The API key is invalid or not set correctly.";
        } else if (error.message.includes("API Key is missing")) {
          userErrorMessage = "AI Friend Error: The API Key is missing. The AI is disabled.";
        }
        
        io.emit('system message', userErrorMessage);
        // --- *** END OF NEW ERROR HANDLING *** ---
      }
    };

    socket.on('chat message', (msg) => {
      console.log('message: ' + msg.text);

      if (aiTimer) clearTimeout(aiTimer);
      aiTimer = setTimeout(triggerAI, 10000); // 10 seconds

      chatHistory.push({
        user: msg.user,
        text: msg.text,
        isAI: false,
      });
      if (chatHistory.length > 10) chatHistory.shift(); 

      socket.broadcast.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
      if (aiTimer) clearTimeout(aiTimer);
    });
  });

  return io;
};