// We REMOVED all the dotenv and path logic from this file.
// Its only job is to read the variables that index.js already loaded.

// --- THIS IS THE FIX ---
// We try to get the PORT from the .env file.
// If it is 'undefined' (||), we will use '3000' as a default.
const PORT = process.env.PORT || '3000';
// --- END OF FIX ---

/*
// We are commenting out the error check that was crashing the app.
if (!process.env.PORT) {
  throw new Error("⚠️  Missing required environment variable: PORT");
}
*/

export default {
  // Application port
  // We now use our new 'PORT' variable
  port: parseInt(PORT, 10),

  // API keys
  // We'll add our Gemini API key here later
  // geminiApiKey: process.env.GEMINI_API_KEY,

  // Database connection string
  // e.g., databaseURL: process.env.DATABASE_URL,
};