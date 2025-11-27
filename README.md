---
title: Sparky Chat
emoji: 🛡️
colorFrom: red
colorTo: gray
sdk: docker
pinned: false
---

# Sparky Chat - AI-Powered Group Chat

A real-time encrypted group chat application with an AI bot powered by Groq's Llama model.

## Features

- **Real-time Chat**: WebSocket-powered instant messaging with Socket.IO
- **Encrypted Storage**: AES-256 encryption for all messages in MongoDB
- **AI Integration**: Groq Llama 3.3 70B model for intelligent responses
- **Smart Silence**: AI knows when to stay quiet (only responds when relevant)
- **Mr. Robot Theme**: Dark, cyberpunk-inspired UI

## Setup

### Environment Variables

Create a `.env` file with:

```env
PORT=7860
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/?appName=YourApp
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
GROQ_API_KEY=gsk_your_api_key_here
```

### Local Development

```bash
npm install
npm start
```

Visit `http://localhost:7860`

## Deployment to Hugging Face Spaces

1. Create a new Space on Hugging Face
2. Select **Docker** as the SDK
3. Push this repository to the Space
4. Add environment variables in Space settings
5. The app will automatically deploy

## Architecture

- **Backend**: Node.js + Express + Socket.IO
- **Database**: MongoDB Atlas (encrypted)
- **AI**: Groq API (Llama 3.3 70B)
- **Frontend**: Vanilla JavaScript + Socket.IO client

## Security

- Messages encrypted with AES-256-CBC
- Unique IV for each message
- Non-root Docker execution
- CORS configured for production

## License

MIT