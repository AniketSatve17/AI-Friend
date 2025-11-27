// We are hard-coding the variables to force the app to work.

// 1. Set the port directly.
const PORT = 3000;

// 2. --- PASTE YOUR **NEW GROQ** API KEY HERE ---
// This is the key you just got from Groq (starts with 'gsk_...')
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// --- END OF FIX ---


// 3. We will do a simple check.
if (GROQ_API_KEY === "PASTE_YOUR_NEW_GROQ_KEY_HERE" || !GROQ_API_KEY) {
  // We will just warn the user, but not crash
  console.warn(`
    ##############################################################
    ⚠️  WARNING: GROQ_API_KEY is not set in config/index.js!
    The AI Friend will not respond.
    Please paste your key directly into the code on line 12.
    ##############################################################
  `);
}

export default {
  // Application port
  port: PORT,

  // API keys
  groqApiKey: GROQ_API_KEY, // Use the new Groq key

  // Database connection string
  // e.g., databaseURL: process.env.DATABASE_URL,
};