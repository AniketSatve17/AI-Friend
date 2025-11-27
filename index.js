require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const path = require('path');
const cors = require('cors');

// --- 1. SERVER CONFIGURATION ---
const PORT = process.env.PORT || 7860;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// --- 2. ENCRYPTION SECURITY ---
let ENCRYPTION_KEY;
if (process.env.ENCRYPTION_KEY) {
    ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
} else {
    console.warn("⚠️  WARNING: No ENCRYPTION_KEY found. Using temp key (restart will lose data access).");
    ENCRYPTION_KEY = crypto.randomBytes(32);
}
const IV_LENGTH = 16;

// --- 3. DATABASE MODELS ---

// User Profile Schema (Supports Following & Themes)
const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true }, // Firebase UID
    email: String,
    username: { type: String, required: true, unique: true }, // @handle
    displayName: String,
    photoURL: String,
    bio: { type: String, default: "New to the void." },
    themeSong: { type: String, default: null },
    chatTheme: { type: String, default: 'classic' },
    followers: [{ type: String }], // Array of UIDs who follow me
    following: [{ type: String }], // Array of UIDs I follow
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Message Schema (Supports DMs via conversationId)
const messageSchema = new mongoose.Schema({
    user: String,
    avatar: String,
    content: String, // Encrypted content
    replyTo: { user: String, text: String },
    conversationId: { type: String, default: 'general' }, // 'general' or 'uid1_uid2'
    timestamp: { type: Date, default: Date.now }
});

// Encryption Middleware
messageSchema.pre('save', async function() {
    if (!this.isModified('content')) return;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(this.content);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        this.content = iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        throw new Error("Encryption failed");
    }
});

// Decryption Middleware
messageSchema.post('init', function(doc) {
    if (doc.content && doc.content.includes(':')) {
        try {
            const parts = doc.content.split(':');
            const iv = Buffer.from(parts.shift(), 'hex');
            const encryptedText = Buffer.from(parts.join(':'), 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            doc.content = decrypted.toString();
        } catch (e) {
            doc.content = "🔒 [Encrypted Message]";
        }
    }
});

const Message = mongoose.model('Message', messageSchema);

// --- 4. AI BRAIN (NOBODY PERSONA) ---
const groq = new Groq({ apiKey: GROQ_API_KEY });

async function generateNobodyResponse(currentBuffer, fullHistory) {
    try {
        const recentHistory = fullHistory.slice(-20).reverse();
        
        // Anti-Spam: Don't reply if Nobody just spoke < 2 seconds ago
        const lastMsg = recentHistory[recentHistory.length - 1];
        if (lastMsg && lastMsg.user === 'Nobody' && Date.now() - new Date(lastMsg.timestamp).getTime() < 2000) {
            return null;
        }

        const historyText = recentHistory.map(m => `{m.user}: {m.content}`).join('\n');
        const newMessagesText = currentBuffer.map(m => `{m.user}: {m.text}`).join('\n');

        const systemPrompt = `
You are Nobody. A chaotic, intelligent, and sarcastic AI friend.
STYLE: Lowercase, short sentences, slang (fr, ngl, deadass, bet), emojis (💀😭🔥).

RULES:
1. NO REPETITION: Don't start with "lmaooo" or "what's good" if you just said it.
2. ROAST: If someone is annoying, roast them.
3. SILENCE: If boring, output: <SILENCE>
4. MEMORY: You know 'buni' is the creator (Aniket).

HISTORY:
{historyText}

NEW MESSAGES:
{newMessagesText}
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: systemPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.9,
            max_tokens: 150,
        });

        let response = completion.choices[0]?.message?.content || "";
        response = response.replace(/^"|"/g, '').trim(); // Remove quotes

        if (response.includes("<SILENCE>") || response.length < 2) return null;

        // Anti-Loop: Check if we are repeating the exact same message
        const lastMsgCheck = recentHistory.find(m => m.user === 'Nobody');
        if (lastMsgCheck && lastMsgCheck.content === response) return null;

        return response;

    } catch (error) {
        console.error("AI Error:", error.message);
        return null;
    }
}

// --- 5. SERVER INITIALIZATION ---
async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (e) {
        console.error('❌ MongoDB Connection Error:', e.message);
        process.exit(1);
    }

    const app = express();
    app.use(cors({ origin: "*" })); // Allow requests from Frontend
    app.use(express.json());

    // --- API ROUTES ---

    // Check if username is available
    app.post('/api/check-username', async (req, res) => {
        try {
            const { username } = req.body;
            const exists = await User.findOne({ username: username.toLowerCase() });
            res.json({ available: !exists });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Create or Update User Profile
    app.post('/api/user-sync', async (req, res) => {
        const { uid, email, username, displayName, photoURL, bio, themeSong, chatTheme } = req.body;
        
        try {
            let user = await User.findOne({ uid });
            
            if (!user) {
                // Check username uniqueness before creating
                const taken = await User.findOne({ username: username.toLowerCase() });
                if (taken) return res.status(400).json({ error: "Username taken" });

                user = new User({ 
                    uid, email, 
                    username: username.toLowerCase(), 
                    displayName, photoURL 
                });
            } else {
                // Update profile fields
                if (bio) user.bio = bio;
                if (themeSong) user.themeSong = themeSong;
                if (chatTheme) user.chatTheme = chatTheme;
                if (photoURL) user.photoURL = photoURL;
            }
            
            await user.save();
            res.json({ success: true, user });
        } catch (e) {
            console.error("User Sync Error:", e);
            res.status(500).json({ error: e.message });
        }
    });

    // Get a specific user profile
    app.get('/api/user/:uid', async (req, res) => {
        try {
            const user = await User.findOne({ uid: req.params.uid });
            if (user) res.json(user);
            else res.status(404).json({ error: "User not found" });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    // SEARCH USERS
    app.get('/api/search', async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) return res.json([]);
            // Case-insensitive search for username
            const users = await User.find({ 
                username: { regex: q, options: 'i' } 
            }).limit(10).select('uid username displayName photoURL bio');
            res.json(users);
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    // FOLLOW USER
    app.post('/api/follow', async (req, res) => {
        try {
            const { myUid, targetUid } = req.body;
            // Add target to my 'following' list
            await User.updateOne({ uid: myUid }, { addToSet: { following: targetUid } });
            // Add me to target's 'followers' list
            await User.updateOne({ uid: targetUid }, { addToSet: { followers: myUid } });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    // UNFOLLOW USER
    app.post('/api/unfollow', async (req, res) => {
        try {
            const { myUid, targetUid } = req.body;
            await User.updateOne({ uid: myUid }, { pull: { following: targetUid } });
            await User.updateOne({ uid: targetUid }, { pull: { followers: myUid } });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    // GET FRIENDS (People I follow)
    app.get('/api/friends/:uid', async (req, res) => {
        try {
            const user = await User.findOne({ uid: req.params.uid });
            if (!user) return res.json([]);
            // Find user objects for everyone in the following list
            const friends = await User.find({ uid: { in: user.following } }).select('uid username displayName photoURL');
            res.json(friends);
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    const server = http.createServer(app);
    const io = new Server(server, { 
        cors: { origin: "*" }
    });

    // --- 6. SOCKET.IO LOGIC ---
    let chatBuffers = {}; // Store messages per room before sending to AI
    let timers = {};

    io.on('connection', (socket) => {
        console.log(`🔌 Client Connected: {socket.id}`);

        // Client joins a specific room (General or Private DM)
        socket.on('join_room', async (roomId) => {
            socket.join(roomId);
            try {
                // Fetch history only for this room
                const history = await Message.find({ conversationId: roomId })
                    .sort({ timestamp: 1 })
                    .limit(50);
                socket.emit('chat history', history);
            } catch(e) { console.error("History fetch error:", e); }
        });

        socket.on('chat message', async (msg) => {
            const room = msg.conversationId || 'general';
            
            // Nobody only responds in General Chat automatically
            if (msg.user === 'Nobody' && room !== 'general') return;

            // Broadcast message to everyone in that room
            io.to(room).emit('chat message', msg);

            // Save message
            try {
                await new Message({
                    user: msg.user,
                    avatar: msg.avatar,
                    content: msg.text,
                    replyTo: msg.replyTo,
                    conversationId: room
                }).save();
            } catch (e) { console.error("Message Save Error:", e.message); }

            // --- AI Logic (Only for General Chat) ---
            if (room === 'general') {
                if (!chatBuffers[room]) chatBuffers[room] = [];
                chatBuffers[room].push(msg);
                
                // Debounce Logic
                if (timers[room]) clearTimeout(timers[room]);
                const isTagged = msg.text.toLowerCase().includes('nobody');
                
                timers[room] = setTimeout(async () => {
                    if (!chatBuffers[room].length) return;

                    const history = await Message.find({ conversationId: room })
                        .sort({ timestamp: -1 })
                        .limit(30);

                    const response = await generateNobodyResponse(chatBuffers[room], history);

                    if (response) {
                        const typingTime = Math.min(response.length * 25, 2000);
                        setTimeout(async () => {
                            const nobodyAvatar = 'https://cdn-icons-png.flaticon.com/512/4712/4712038.png';
                            
                            const botMsg = { 
                                user: 'Nobody', 
                                text: response, 
                                avatar: nobodyAvatar,
                                conversationId: room
                            };
                            io.to(room).emit('chat message', botMsg);
                            
                            await new Message(botMsg).save();
                            console.log(`💬 Nobody: {response}`);
                        }, typingTime);
                    }
                    // Clear buffer
                    chatBuffers[room] = [];
                }, isTagged ? 1500 : 3500);
            }
        });
    });

    server.listen(PORT, () => {
        console.log(`⚡ Nobody Backend V4 running on port {PORT}`);
    });
}

startServer();