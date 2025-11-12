// We are no longer trying to read the .env file for the API key.

// We try to get the PORT from the .env file (which is also failing,
// so we default to '3000')
const PORT = process.env.PORT || '3000';

// --- THIS IS THE FIX ---
// We are "hard-coding" the API key.
// Paste your key directly between the quotes.
const GEMINI_API_KEY = "AIzaSyCL1Uv8vZo9am_UaBXV2D9fLulPiXxWSUA"; // <-- YOUR KEY GOES HERE
// --- END OF FIX ---


// We will do a simple check.
// This checks if the key is *still* the placeholder
if (GEMINI_API_KEY === "YOUR_API_KEY_GOES_HERE" || !GEMINI_API_KEY) {
  // We will just warn the user, but not crash
  console.warn(`
    ##############################################################
    ⚠️  WARNING: GEMINI_API_KEY is not set in config/index.js!
    The AI Friend will not respond.
    Please paste your key directly into the code on line 12.
    ##############################################################
  `);
}

export default {
  // Application port
  port: parseInt(PORT, 10),

  // API keys
  geminiApiKey: GEMINI_API_KEY, // Use the hard-coded variable

  // Database connection string
  // e.g., databaseURL: process.env.DATABASE_URL,
};