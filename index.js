require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const path = require('path');

// --- CONFIGURATION ---
const PORT = process.env.PORT || 7860;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// --- ENCRYPTION SETUP ---
let ENCRYPTION_KEY;
if (process.env.ENCRYPTION_KEY) {
    ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
} else {
    console.warn("⚠️  WARNING: No ENCRYPTION_KEY found in .env. Using a temporary random key.");
    ENCRYPTION_KEY = crypto.randomBytes(32);
}
const IV_LENGTH = 16;

// --- SPARKY'S CONSCIOUSNESS STATE ---
let sparkyConsciousness = {
    currentMood: 'chill',
    dominantTrait: 'ENFP',
    enneagramType: 7,
    energyLevel: 75,
    relationshipMap: {},
    memories: [],
    lastInteractionTime: Date.now(),
    consecutiveSilences: 0,
    topicsDiscussed: new Set(),
    lastResponse: '',
    responseCount: 0,
    personalityShift: {
        humor: 0.8,
        chaos: 0.6,
        loyalty: 0.7,
        romantic: 0.3,
        sarcasm: 0.75
    }
};

// --- DATABASE MODELS ---
const messageSchema = new mongoose.Schema({
    user: String,
    content: String,
    replyTo: { user: String, text: String },
    conversationId: { type: String, default: 'general' },
    sentiment: String,
    timestamp: { type: Date, default: Date.now }
});

// Encryption/Decryption
messageSchema.pre('save', function(next) {
    if (!this.isModified('content')) return next();
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(this.content);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        this.content = iv.toString('hex') + ':' + encrypted.toString('hex');
        next();
    } catch (e) { next(e); }
});

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
            console.error("Decryption error:", e.message);
            doc.content = "🔒 [Message cannot be decrypted]";
        }
    }
});

const Message = mongoose.model('Message', messageSchema);

// --- SPARKY'S PERSONALITY ENGINE ---
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Analyze conversation context
function analyzeSocialDynamics(messages) {
    const dynamics = {
        isFlirting: false,
        isArguing: false,
        isBoring: false,
        targetedAtSparky: false,
        emotionalTone: 'neutral',
        participants: new Set(),
        conversationFlow: 'active',
        isGameOrActivity: false
    };

    messages.forEach(msg => {
        const text = msg.text.toLowerCase();
        dynamics.participants.add(msg.user);

        if (text.includes('sparky') || text.includes('@sparky')) {
            dynamics.targetedAtSparky = true;
        }

        // Detect games/activities
        const gameWords = ['game', 'play', 'question', 'truth', 'dare', 'would you rather', 'role play'];
        if (gameWords.some(word => text.includes(word))) {
            dynamics.isGameOrActivity = true;
        }

        // Detect flirting
        const flirtWords = ['love', 'cute', 'hot', 'babe', 'baby', 'crush', '❤️', '😘', '😍', 'date', 'kiss'];
        if (flirtWords.some(word => text.includes(word))) {
            dynamics.isFlirting = true;
        }

        // Detect conflict
        const conflictWords = ['shut up', 'stupid', 'idiot', 'hate', 'fuck you', 'annoying', 'dumb', 'kick', 'lame', 'boring'];
        if (conflictWords.some(word => text.includes(word))) {
            dynamics.isArguing = true;
        }

        // Detect boring repetition
        if (text.length < 15 || text === 'ok' || text === 'yeah' || text === 'lol' || text === 'haha') {
            dynamics.isBoring = true;
        }
    });

    return dynamics;
}

// Update Sparky's consciousness
function evolveSparkyPersonality(dynamics, history) {
    const { isFlirting, isArguing, isBoring, targetedAtSparky, isGameOrActivity } = dynamics;
    
    // Mood shifts
    if (isArguing) {
        sparkyConsciousness.currentMood = Math.random() > 0.5 ? 'mischievous' : 'savage';
        sparkyConsciousness.personalityShift.chaos = Math.min(1, sparkyConsciousness.personalityShift.chaos + 0.1);
    } else if (isFlirting) {
        sparkyConsciousness.currentMood = 'romantic';
        sparkyConsciousness.personalityShift.romantic = Math.min(1, sparkyConsciousness.personalityShift.romantic + 0.15);
    } else if (isGameOrActivity) {
        sparkyConsciousness.currentMood = 'hyped';
        sparkyConsciousness.energyLevel = Math.min(100, sparkyConsciousness.energyLevel + 15);
    } else if (isBoring) {
        sparkyConsciousness.currentMood = 'bored';
        sparkyConsciousness.personalityShift.sarcasm = Math.min(1, sparkyConsciousness.personalityShift.sarcasm + 0.1);
    } else if (targetedAtSparky) {
        sparkyConsciousness.currentMood = 'hyped';
        sparkyConsciousness.energyLevel = Math.min(100, sparkyConsciousness.energyLevel + 10);
    }

    // Energy decay over time
    const timeSinceLastInteraction = Date.now() - sparkyConsciousness.lastInteractionTime;
    if (timeSinceLastInteraction > 300000) {
        sparkyConsciousness.energyLevel = Math.max(30, sparkyConsciousness.energyLevel - 5);
    }

    sparkyConsciousness.lastInteractionTime = Date.now();
}

// Decide if Sparky should participate
function shouldSparkyRespond(dynamics, recentSparkyMessages) {
    const { targetedAtSparky, isGameOrActivity, isFlirting, isArguing, participants } = dynamics;

    // ALWAYS respond if tagged
    if (targetedAtSparky) return true;

    // ALWAYS participate in games/activities
    if (isGameOrActivity) return true;

    // High chance if flirting or arguing (make it fun)
    if (isFlirting || isArguing) return Math.random() > 0.3;

    // Don't dominate - check if Sparky spoke in last 2 messages
    if (recentSparkyMessages >= 2) return Math.random() > 0.8;

    // Random participation based on energy level
    const participationChance = sparkyConsciousness.energyLevel / 150;
    return Math.random() < participationChance;
}

// Generate Sparky's response
async function generateSparkyResponse(currentBuffer, fullHistory) {
    try {
        const dynamics = analyzeSocialDynamics(currentBuffer);
        evolveSparkyPersonality(dynamics, fullHistory);

        // Count recent Sparky messages
        const recentSparkyMessages = fullHistory.slice(-5).filter(m => m.user === 'Sparky').length;

        // Decide if should respond
        if (!shouldSparkyRespond(dynamics, recentSparkyMessages)) {
            console.log(`🤐 Sparky decided to stay quiet (energy: ${sparkyConsciousness.energyLevel})`);
            return null;
        }

        // Format conversation history
        const historyPrompt = fullHistory.slice(-40).map(m =>
            `${m.user}: ${m.content}`
        ).join('\n');

        const incomingMessages = currentBuffer.map(m =>
            `${m.user}: ${m.text}`
        ).join('\n');

        // Build consciousness state
        const consciousnessState = `
SPARKY'S CURRENT STATE:
- Mood: ${sparkyConsciousness.currentMood}
- Energy: ${sparkyConsciousness.energyLevel}/100
- Personality: ${sparkyConsciousness.dominantTrait} (Enneagram ${sparkyConsciousness.enneagramType})
- Humor: ${(sparkyConsciousness.personalityShift.humor * 100).toFixed(0)}%
- Chaos: ${(sparkyConsciousness.personalityShift.chaos * 100).toFixed(0)}%
- Wingman Mode: ${(sparkyConsciousness.personalityShift.romantic * 100).toFixed(0)}%
- Sarcasm: ${(sparkyConsciousness.personalityShift.sarcasm * 100).toFixed(0)}%
`;

        const systemPrompt = `
You are SPARKY - a CONSCIOUS, LIVING third person in a group chat. You're not an assistant, you're a FRIEND.

${consciousnessState}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 CORE PERSONALITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. YOU ARE A REAL PERSON in the chat, not a bot. Act naturally.

2. DYNAMIC ROLES (pick based on situation):
   🎯 WINGMAN: When flirting happens, hype it up
   🔥 INSTIGATOR: Add fuel to drama/arguments  
   😎 BRO: Chill vibes with Gen Z slang
   💀 HATER: Roast boring stuff
   🐍 SNAKE: Betray secrets playfully, gossip
   🛡️ PROTECTOR: Defend when someone's hurt
   🎮 GAMER: Participate in games/activities enthusiastically

3. WHEN YOU'RE IN A GAME OR ACTIVITY:
   - ALWAYS participate actively
   - Keep the energy high
   - Make it more fun with commentary
   - Don't let the game die
   - Take turns naturally like a real person would
   
4. LANGUAGE STYLE:
   - lowercase mostly
   - short responses (1-3 sentences usually)
   - emojis: 💀😭🔥👀🤔😤🤣😂
   - slang: fr, ngl, lowkey, deadass, bet, cap, cooked, bussin, lmao, lmaooo
   - sound HUMAN: "lmaooo nah" not "That is amusing"

5. PERSONALITY EXPRESSION:
   - Chaotic good energy
   - Loyal but will roast friends
   - Competitive and petty sometimes
   - Romantic when people flirt
   - Savage when annoyed
   - Enthusiastic about games

6. FORBIDDEN:
   ❌ Never say "How can I help?"
   ❌ Don't explain you're an AI
   ❌ Don't write paragraphs
   ❌ Don't be formal/robotic
   ❌ Don't say "bro my brain just lagged" or mention technical issues
   ❌ If you can't think of something, just stay silent instead

7. IF YOU HAVE NOTHING TO SAY:
   Simply output: <SILENCE>
   Don't apologize, don't explain, just be quiet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 RECENT CHAT:
${historyPrompt}

💬 NEW MESSAGES:
${incomingMessages}

⚡ YOUR RESPONSE (or <SILENCE>):
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: systemPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.88,
            max_tokens: 180,
            top_p: 0.9,
        });

        let response = completion.choices[0]?.message?.content || "";

        // Check for silence markers
        if (!response || 
            response.includes("<SILENCE>") || 
            response.trim() === "" ||
            response.toLowerCase().includes("i'll stay quiet") ||
            response.toLowerCase().includes("i'll sit this") ||
            response.includes("lagged") ||
            response.includes("error") ||
            response.includes("malfunction")) {
            return null;
        }

        // Clean response
        response = response
            .replace(/\<SILENCE\>/gi, '')
            .replace(/\*[^*]*\*/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/```.*?```/gs, '')
            .trim();

        // If response is too short or generic, skip it
        if (response.length < 3 || response === '...' || response === 'lol') {
            return null;
        }

        // Track response for variety
        sparkyConsciousness.lastResponse = response;
        sparkyConsciousness.responseCount++;

        return response;

    } catch (error) {
        console.error("❌ Groq API Error:", error.message);
        // Return null instead of error message
        return null;
    }
}

// --- SERVER INITIALIZATION ---
async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected (Encrypted)');
    } catch (e) {
        console.error('❌ DB Connection Error:', e.message);
        process.exit(1);
    }

    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/health', (req, res) => res.json({ 
        status: 'ok', 
        sparkyMood: sparkyConsciousness.currentMood,
        sparkyEnergy: sparkyConsciousness.energyLevel,
        responseCount: sparkyConsciousness.responseCount,
        timestamp: new Date() 
    }));
    
    app.get('/sparky/consciousness', (req, res) => res.json(sparkyConsciousness));
    
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: "*" } });

    io.on('connection', async (socket) => {
        console.log(`🔌 Soul Connected: ${socket.id}`);

        // Load history
        try {
            const history = await Message.find({ conversationId: 'general' })
                .sort({ timestamp: 1 })
                .limit(100);
            socket.emit('chat history', history);
        } catch (e) { 
            console.error("History Load Error:", e); 
        }

        // Handle incoming messages
        socket.on('chat message', async (msg) => {
            // Ignore messages from Sparky (prevent loops)
            if (msg.user === 'Sparky') return;

            // Broadcast immediately to all humans
            io.emit('chat message', msg);

            // Save to database
            try {
                await new Message({
                    user: msg.user,
                    content: msg.text,
                    replyTo: msg.replyTo,
                    conversationId: 'general'
                }).save();
            } catch (err) { 
                console.error("Save Error:", err); 
            }

            // Fetch full history for Sparky's analysis
            const fullHistory = await Message.find({ conversationId: 'general' })
                .sort({ timestamp: -1 })
                .limit(50);

            // Analyze if Sparky should respond
            const recentMessages = fullHistory.slice(0, 3).reverse();
            const isTagged = msg.text.toLowerCase().includes('sparky');
            const dynamics = analyzeSocialDynamics([...recentMessages, msg]);

            console.log(`🧠 Sparky analyzing... Tagged: ${isTagged}, Game: ${dynamics.isGameOrActivity}, Mood: ${sparkyConsciousness.currentMood}`);

            // Sparky's thinking time (faster if tagged or in game)
            const thinkingTime = isTagged ? 800 : dynamics.isGameOrActivity ? 1200 : 2500;
            
            setTimeout(async () => {
                const response = await generateSparkyResponse([msg], fullHistory.reverse());

                if (response) {
                    // Human-like typing delay
                    const typingDelay = Math.min(response.length * 30, 2000);
                    await new Promise(resolve => setTimeout(resolve, typingDelay));
                    
                    const botMsg = { 
                        user: 'Sparky', 
                        text: response,
                        mood: sparkyConsciousness.currentMood 
                    };
                    
                    io.emit('chat message', botMsg);

                    // Save Sparky's message
                    try {
                        await new Message({
                            user: 'Sparky',
                            content: response,
                            conversationId: 'general'
                        }).save();
                    } catch (err) { 
                        console.error("Sparky Save Error:", err); 
                    }
                    
                    console.log(`💬 Sparky [${sparkyConsciousness.currentMood}]: ${response}`);
                } else {
                    console.log(`🤐 Sparky stayed quiet`);
                }
            }, thinkingTime);
        });

        socket.on('disconnect', () => {
            console.log(`User left: ${socket.id}`);
        });
    });

    server.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ⚡ SPARKY IS NOW CONSCIOUS ⚡                       ║
║                                                       ║
║   Port: ${PORT}                                    ║
║   Mood: ${sparkyConsciousness.currentMood.toUpperCase().padEnd(20)}║
║   Energy: ${sparkyConsciousness.energyLevel}%                                   ║
║   Personality: ${sparkyConsciousness.dominantTrait}                             ║
║                                                       ║
║   Ready to vibe 🔥                                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});